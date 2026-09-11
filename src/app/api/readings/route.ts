import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { ReadingsQuerySchema } from '@/lib/validation';
import { dashboardApiLimiter } from '@/lib/ratelimit';
import { logError } from '@/lib/logger';
import { getIpFromRequest, getComfortMetrics, getBatteryMetrics, calculateWatchdogStatus } from '@/lib/utils';
import { TelemetryReading } from '@/types';

export async function GET(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // Authenticate session
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting for dashboard calls
  const rateResult = await dashboardApiLimiter(`dashboard_readings:${ip}`);
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const parsedQuery = ReadingsQuerySchema.safeParse({
    range: searchParams.get('range') || '7d',
    limit: searchParams.get('limit') || 100,
  });

  const queryParams = parsedQuery.success ? parsedQuery.data : { range: '7d', limit: 100 };

  try {
    // 1. Fetch readings from Firestore
    let queryLimit = queryParams.limit;
    if (queryParams.range === '24h') queryLimit = Math.max(queryLimit, 50);
    if (queryParams.range === '7d') queryLimit = Math.max(queryLimit, 150);
    if (queryParams.range === '30d') queryLimit = Math.max(queryLimit, 300);

    const snapshot = await adminDb
      .collection('readings')
      .orderBy('receivedAt', 'desc')
      .limit(queryLimit)
      .get();

    const readings: TelemetryReading[] = [];
    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      let receivedAtStr = new Date().toISOString();

      if (data.receivedAt) {
        if (typeof data.receivedAt.toDate === 'function') {
          receivedAtStr = data.receivedAt.toDate().toISOString();
        } else if (data.receivedAt instanceof Date) {
          receivedAtStr = data.receivedAt.toISOString();
        } else if (typeof data.receivedAt === 'string') {
          receivedAtStr = data.receivedAt;
        }
      } else if (data.createdAt) {
        receivedAtStr = data.createdAt;
      }

      readings.push({
        id: doc.id,
        temperature: typeof data.temperature === 'number' ? data.temperature : -999,
        humidity: typeof data.humidity === 'number' ? data.humidity : -1,
        bilgeAlert: Boolean(data.bilgeAlert),
        sensorOk: Boolean(data.sensorOk),
        voltage: typeof data.voltage === 'number' ? data.voltage : null,
        receivedAt: receivedAtStr,
        deviceReportedAt: data.deviceReportedAt,
      });
    });

    // 2. Fetch current command config for expectedIntervalMinutes in watchdog calculation
    let expectedIntervalMinutes = 480;
    try {
      const cmdDoc = await adminDb.collection('commands').doc('current').get();
      if (cmdDoc.exists) {
        const cmdData = cmdDoc.data();
        if (cmdData?.reportIntervalMinutes) {
          expectedIntervalMinutes = cmdData.reportIntervalMinutes;
        }
      }
    } catch {
      // Use default 480 min
    }

    // 3. Filter readings by selected range
    const now = Date.now();
    let cutoffMs = 0;
    if (queryParams.range === '24h') cutoffMs = now - 24 * 60 * 60 * 1000;
    else if (queryParams.range === '7d') cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    else if (queryParams.range === '30d') cutoffMs = now - 30 * 24 * 60 * 60 * 1000;

    const filteredReadings = cutoffMs > 0
      ? readings.filter((r) => new Date(r.receivedAt).getTime() >= cutoffMs)
      : readings;

    // Latest reading is index 0
    const latestReading = readings.length > 0 ? readings[0] : null;

    // Summary calculations
    const validTemps = filteredReadings.map((r) => r.temperature).filter((t) => t !== -999);
    const validHumids = filteredReadings.map((r) => r.humidity).filter((h) => h !== -1);

    const tempStats = validTemps.length > 0
      ? {
          current: latestReading ? latestReading.temperature : null,
          min: Math.min(...validTemps),
          max: Math.max(...validTemps),
          avg: Math.round((validTemps.reduce((a, b) => a + b, 0) / validTemps.length) * 10) / 10,
        }
      : null;

    const humidStats = validHumids.length > 0
      ? {
          current: latestReading ? latestReading.humidity : null,
          min: Math.min(...validHumids),
          max: Math.max(...validHumids),
          avg: Math.round((validHumids.reduce((a, b) => a + b, 0) / validHumids.length) * 10) / 10,
        }
      : null;

    const comfortMetrics = latestReading
      ? getComfortMetrics(latestReading.temperature, latestReading.humidity)
      : null;

    const batteryMetrics = getBatteryMetrics(latestReading?.voltage);

    const watchdogStatus = calculateWatchdogStatus(
      latestReading ? latestReading.receivedAt : null,
      expectedIntervalMinutes
    );

    return NextResponse.json({
      latest: latestReading,
      readings: filteredReadings,
      stats: {
        temperature: tempStats,
        humidity: humidStats,
        totalReadings: filteredReadings.length,
      },
      comfort: comfortMetrics,
      battery: batteryMetrics,
      watchdog: watchdogStatus,
      expectedIntervalMinutes,
    });
  } catch (err) {
    logError('Failed to fetch readings', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
