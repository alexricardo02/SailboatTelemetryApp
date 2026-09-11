import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { EventNotesUpdateSchema } from '@/lib/validation';
import { dashboardApiLimiter } from '@/lib/ratelimit';
import { logError, logInfo } from '@/lib/logger';
import { getIpFromRequest } from '@/lib/utils';
import { BilgeEvent } from '@/types';

export async function GET(req: NextRequest) {
  const ip = getIpFromRequest(req);

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateResult = await dashboardApiLimiter(`dashboard_events:${ip}`);
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const snapshot = await adminDb
      .collection('events')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();

    const events: BilgeEvent[] = [];
    const frequencyByDay: Record<string, number> = {};

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      let timestampStr = new Date().toISOString();

      if (data.timestamp) {
        if (typeof data.timestamp.toDate === 'function') {
          timestampStr = data.timestamp.toDate().toISOString();
        } else if (data.timestamp instanceof Date) {
          timestampStr = data.timestamp.toISOString();
        } else if (typeof data.timestamp === 'string') {
          timestampStr = data.timestamp;
        }
      } else if (data.createdAt) {
        timestampStr = data.createdAt;
      }

      const dayKey = timestampStr.split('T')[0];
      frequencyByDay[dayKey] = (frequencyByDay[dayKey] || 0) + 1;

      events.push({
        id: doc.id,
        timestamp: timestampStr,
        readingId: data.readingId,
        durationSeconds: data.durationSeconds || null,
        notes: data.notes || '',
        resolved: Boolean(data.resolved),
      });
    });

    // Format frequency data sorted by day
    const frequencyData = Object.entries(frequencyByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      events,
      frequency: frequencyData,
      totalCount: events.length,
      unresolvedCount: events.filter((e) => !e.resolved).length,
    });
  } catch (err) {
    logError('Failed to fetch bilge events', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ip = getIpFromRequest(req);

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateResult = await dashboardApiLimiter(`dashboard_patch_events:${ip}`);
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('id');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = EventNotesUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection('events').doc(eventId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      notes: parsed.data.notes,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user?.name || 'user',
    };

    if (parsed.data.resolved !== undefined) {
      updates.resolved = parsed.data.resolved;
    }

    await docRef.update(updates);

    logInfo('Bilge event updated', { eventId, user: session.user?.name });

    return NextResponse.json({ success: true, eventId, updates });
  } catch (err) {
    logError('Failed to update bilge event', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
