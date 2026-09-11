import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { CommandUpdateSchema } from '@/lib/validation';
import { commandsDeviceLimiter, commandsUserLimiter } from '@/lib/ratelimit';
import { logSecurityEvent, logError, logInfo } from '@/lib/logger';
import { getIpFromRequest } from '@/lib/utils';
import { timingSafeEqualStrings } from '@/lib/security';
import * as admin from 'firebase-admin';

export async function GET(req: NextRequest) {
  const ip = getIpFromRequest(req);
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.DEVICE_API_KEY || 'sailboat-dev-device-key-2024';

  let isDevice = false;

  // Check if called by ESP32 device
  if (apiKey) {
    const isKeyValid = timingSafeEqualStrings(apiKey, expectedKey);
    if (!isKeyValid) {
      logSecurityEvent({
        type: 'device_auth_failed',
        ip,
        path: '/api/commands',
        reason: 'wrong_key',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    isDevice = true;

    // Rate limit device calls (1 req / min)
    const rateResult = await commandsDeviceLimiter(`commands_dev:${ip}`);
    if (!rateResult.success) {
      logSecurityEvent({
        type: 'rate_limit_hit',
        ip,
        path: '/api/commands',
      });
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  } else {
    // Check if called by authenticated dashboard user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const docRef = adminDb.collection('commands').doc('current');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Default initial command if not yet seeded
      const defaultConfig = {
        reportIntervalMinutes: 480, // 8 hours (3x/day)
        mode: 'normal',
        updatedAt: new Date().toISOString(),
      };
      await docRef.set(defaultConfig);
      return NextResponse.json(defaultConfig);
    }

    const data = docSnap.data();

    // If device fetched, mark lastFetchedAt
    if (isDevice) {
      const timestamp = isFirebaseConfigured
        ? admin.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();
      await docRef.update({
        lastFetchedAt: timestamp,
      });
    }

    return NextResponse.json({
      reportIntervalMinutes: data.reportIntervalMinutes || 480,
      mode: data.mode || 'normal',
      updatedAt: data.updatedAt,
      lastFetchedAt: data.lastFetchedAt,
    });
  } catch (err) {
    logError('Failed to retrieve commands', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // Authenticate dashboard user
  const session = await getServerSession(authOptions);
  if (!session) {
    logSecurityEvent({
      type: 'unauthorized_access',
      ip,
      path: '/api/commands',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit user command updates (10 req / min)
  const rateResult = await commandsUserLimiter(`user_command:${session.user?.name || ip}`);
  if (!rateResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CommandUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid command payload', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { reportIntervalMinutes, mode } = parsed.data;

  try {
    const timestamp = isFirebaseConfigured
      ? admin.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();

    const updateData = {
      reportIntervalMinutes,
      mode,
      updatedAt: timestamp,
      updatedAtFormatted: new Date().toISOString(),
      updatedBy: session.user?.name || 'user',
    };

    await adminDb.collection('commands').doc('current').set(updateData, { merge: true });

    logInfo('Command configuration updated', {
      user: session.user?.name,
      mode,
      reportIntervalMinutes,
    });

    logSecurityEvent({
      type: 'command_updated',
      ip,
      mode,
      reportIntervalMinutes,
    });

    return NextResponse.json({
      success: true,
      message: 'Command queued for next ESP32 wake cycle.',
      command: {
        reportIntervalMinutes,
        mode,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logError('Failed to update command config', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
