export type TelemetryMode = 'normal' | 'navigation' | 'winter_storage' | 'custom';

export interface TelemetryReading {
  id?: string;
  temperature: number; // Celsius, -999 if sensor failed
  humidity: number;    // %, -1 if sensor failed
  bilgeAlert: boolean; // true = water detected
  sensorOk: boolean;   // true if HTU21D read successfully
  voltage?: number | null; // optional voltage (e.g. 12.6V)
  receivedAt: string | number | Date; // ISO string or Firestore timestamp
  deviceReportedAt?: string | number | Date;
}

export interface BilgeEvent {
  id?: string;
  timestamp: string | number | Date;
  readingId?: string;
  durationSeconds?: number;
  notes?: string;
  resolved?: boolean;
}

export interface DownlinkCommand {
  reportIntervalMinutes: number; // e.g. 480 (8h), 60 (1h), 1440 (24h)
  mode: TelemetryMode;
  updatedAt: string | number | Date;
  lastFetchedAt?: string | number | Date;
  pendingSync?: boolean;
}

export interface WatchdogStatus {
  isOnline: boolean;
  isWarning: boolean;
  isDeadManTriggered: boolean; // 2 consecutive missed cycles
  lastReadingAt: string | null;
  expectedIntervalMinutes: number;
  missedIntervalsCount: number;
  minutesSinceLastReading: number;
  nextExpectedReportAt: string | null;
}

export interface ComfortMetrics {
  dewPoint: number;
  isCondensationRisk: boolean; // Temp within 2°C of dew point
  tempMarginToDewPoint: number;
  humidityStatus: 'green' | 'yellow' | 'red'; // Green: <65%, Yellow: 65-75%, Red: >75%
  comfortDescription: string;
}

export interface BatteryMetrics {
  hasVoltage: boolean;
  voltage: number | null;
  percentage: number | null;
  estimatedHoursRemaining: number | null;
  status: 'good' | 'warning' | 'critical' | 'unknown';
}
