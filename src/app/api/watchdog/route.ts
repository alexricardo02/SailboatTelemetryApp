import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { calculateWatchdogStatus } from '@/lib/utils';
import { dashboardApiLimiter } from '@/lib/ratelimit';
import { getIpFromRequest } from '@/lib/utils';
import { logError } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const ip = getIpFromRequest(req);

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateResult = await dashboardApiLimiter(`dashboard_watchdog:${ip}`);
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const readingsSnap = await adminDb
      .collection('readings')
      .orderBy('receivedAt', 'desc')
      .limit(1)
      .get();

    const latestDoc = readingsSnap.docs.length > 0 ? readingsSnap.docs[0].data() : null;
    let receivedAtStr = null;

    if (latestDoc) {
      if (latestDoc.receivedAt) {
        if (typeof latestDoc.receivedAt.toDate === 'function') {
          receivedAtStr = latestDoc.receivedAt.toDate().toISOString();
        } else if (latestDoc.receivedAt instanceof Date) {
          receivedAtStr = latestDoc.receivedAt.toISOString();
        } else {
          receivedAtStr = String(latestDoc.receivedAt);
        }
      } else if (latestDoc.createdAt) {
        receivedAtStr = latestDoc.createdAt;
      }
    }

    let expectedInterval = 480;
    try {
      const cmdDoc = await adminDb.collection('commands').doc('current').get();
      if (cmdDoc.exists && cmdDoc.data()?.reportIntervalMinutes) {
        expectedInterval = cmdDoc.data().reportIntervalMinutes;
      }
    } catch {
      // Default
    }

    const watchdog = calculateWatchdogStatus(receivedAtStr, expectedInterval);

    return NextResponse.json({
      watchdog,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError('Error fetching watchdog status', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
