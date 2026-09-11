import { z } from 'zod';

// Strict schema for ESP32 Telemetry POST
// Rejects unknown extra fields to prevent injection or malformed data
export const TelemetryPayloadSchema = z
  .object({
    temperature: z
      .number({ required_error: 'temperature is required' })
      .refine(
        (val) => val === -999 || (val >= -60 && val <= 100),
        'temperature must be between -60°C and 100°C or -999 for sensor failure'
      ),
    humidity: z
      .number({ required_error: 'humidity is required' })
      .refine(
        (val) => val === -1 || (val >= 0 && val <= 100),
        'humidity must be between 0% and 100% or -1 for sensor failure'
      ),
    bilgeAlert: z.boolean({ required_error: 'bilgeAlert is required' }),
    sensorOk: z.boolean({ required_error: 'sensorOk is required' }),
    voltage: z
      .number()
      .min(0, 'Voltage cannot be negative')
      .max(30, 'Voltage exceeding maximum expected bounds')
      .nullable()
      .optional(),
    deviceReportedAt: z.union([z.string(), z.number()]).optional(),
  })
  .strict();

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;

// Schema for updating ESP32 Downlink Commands
export const CommandUpdateSchema = z
  .object({
    reportIntervalMinutes: z
      .number({ required_error: 'reportIntervalMinutes is required' })
      .int('Must be an integer')
      .min(1, 'Interval must be at least 1 minute')
      .max(10080, 'Interval cannot exceed 7 days (10080 minutes)'),
    mode: z.enum(['normal', 'navigation', 'winter_storage', 'custom'], {
      required_error: 'mode is required',
    }),
  })
  .strict();

export type CommandUpdatePayload = z.infer<typeof CommandUpdateSchema>;

// Schema for updating Bilge Event notes with HTML sanitization
export const EventNotesUpdateSchema = z
  .object({
    notes: z
      .string()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .transform((val) => val.replace(/<[^>]*>?/gm, '').trim()),
    resolved: z.boolean().optional(),
  })
  .strict();

// Schema for querying readings
export const ReadingsQuerySchema = z.object({
  range: z.enum(['24h', '7d', '30d', 'all']).optional().default('7d'),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
});

// Schema for login credentials
export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
});
