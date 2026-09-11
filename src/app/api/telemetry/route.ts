import { NextRequest, NextResponse } from 'next/server';
import { adminDb, isFirebaseConfigured } from '@/lib/firebase-admin';
import { TelemetryPayloadSchema } from '@/lib/validation';
import { telemetryLimiter } from '@/lib/ratelimit';
import { logSecurityEvent, logError, logInfo } from '@/lib/logger';
import { getIpFromRequest } from '@/lib/utils';
import { timingSafeEqualStrings } from '@/lib/security';
import * as admin from 'firebase-admin';

// Reject bodies larger than 4 KB to prevent abuse
const MAX_BODY_BYTES = 4096;

export async function POST(req: NextRequest) {
  const ip = getIpFromRequest(req);

  // --- 1. Rate limiting by IP (Applied first to stop DoS/brute force on auth) ---
  const rateKey = `telemetry_ip:${ip}`;
  const rateResult = await telemetryLimiter(rateKey);
  if (!rateResult.success) {
    logSecurityEvent({
      type: 'rate_limit_hit',
      ip,
      path: '/api/telemetry',
      resetAt: new Date(rateResult.reset).toISOString(),
    });
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // --- 2. API key authentication (Constant-time comparison) ---
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = process.env.DEVICE_API_KEY || 'sailboat-dev-device-key-2024';

  const isAuthValid = timingSafeEqualStrings(apiKey, expectedKey);
  if (!isAuthValid) {
    logSecurityEvent({
      type: 'device_auth_failed',
      ip,
      path: '/api/telemetry',
      reason: !apiKey ? 'missing_key' : 'wrong_key',
    });
    // Generic 401 without leakage
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 3. Body size check ---
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    logSecurityEvent({
      type: 'invalid_payload',
      ip,
      path: '/api/telemetry',
      reason: 'body_too_large',
      contentLength,
    });
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // --- 4. Parse and validate body ---
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    logSecurityEvent({ type: 'invalid_payload', ip, path: '/api/telemetry', reason: 'invalid_json' });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = TelemetryPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    logSecurityEvent({
      type: 'invalid_payload',
      ip,
      path: '/api/telemetry',
      reason: 'schema_validation_failed',
      issues: parsed.error.issues.map((i) => i.path.join('.')),
    });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const payload = parsed.data;

  // --- 5. Write to Firestore ---
  try {
    const timestamp = isFirebaseConfigured ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString();

    const docRef = await adminDb.collection('readings').add({
      ...payload,
      receivedAt: timestamp,
      createdAt: new Date().toISOString(),
    });

    logInfo('Telemetry received', { docId: docRef.id, ip, bilgeAlert: payload.bilgeAlert });

    // --- 6. Bilge alert logging ---
    if (payload.bilgeAlert) {
      await adminDb.collection('events').add({
        timestamp,
        createdAt: new Date().toISOString(),
        readingId: docRef.id,
        temperature: payload.temperature,
        humidity: payload.humidity,
        notes: 'Automatic bilge water detection event logged by ESP32.',
        resolved: false,
      });
      logSecurityEvent({
        type: 'bilge_alert',
        ip,
        timestamp: new Date().toISOString(),
        readingId: docRef.id,
      });
    }

    return NextResponse.json({ ok: true, id: docRef.id }, { status: 200 });
  } catch (err) {
    logError('Failed to write telemetry to Firestore', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
