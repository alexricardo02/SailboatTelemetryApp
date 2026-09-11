import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { calculateWatchdogStatus } from '@/lib/utils';
import { logSecurityEvent, logInfo, logError } from '@/lib/logger';
import { getIpFromRequest } from '@/lib/utils';
import { timingSafeEqualStrings } from '@/lib/security';

export async function GET(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // Authenticate cron if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    const expectedHeader = `Bearer ${cronSecret}`;

    if (!authHeader || !timingSafeEqualStrings(authHeader, expectedHeader)) {
      logSecurityEvent({
        type: 'unauthorized_access',
        ip,
        path: '/api/cron/watchdog',
        reason: 'invalid_cron_secret',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 1. Get latest reading
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

    // 2. Get expected interval
    let expectedInterval = 480;
    try {
      const cmdDoc = await adminDb.collection('commands').doc('current').get();
      if (cmdDoc.exists && cmdDoc.data()?.reportIntervalMinutes) {
        expectedInterval = cmdDoc.data().reportIntervalMinutes;
      }
    } catch {
      // Default
    }

    // 3. Compute watchdog status
    const watchdog = calculateWatchdogStatus(receivedAtStr, expectedInterval);

    if (watchdog.isDeadManTriggered) {
      logSecurityEvent({
        type: 'watchdog_alert',
        ip,
        reason: 'dead_man_switch_triggered',
        missedIntervalsCount: watchdog.missedIntervalsCount,
        minutesSinceLastReading: watchdog.minutesSinceLastReading,
        lastReadingAt: watchdog.lastReadingAt || 'none',
      });
    } else {
      logInfo('Watchdog check passed', {
        minutesSinceLastReading: watchdog.minutesSinceLastReading,
        isOnline: watchdog.isOnline,
      });
    }

    return NextResponse.json({
      success: true,
      watchdog,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError('Error running watchdog cron', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
