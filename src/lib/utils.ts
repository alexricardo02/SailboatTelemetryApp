import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComfortMetrics, BatteryMetrics, WatchdogStatus } from '@/types';
import { extractClientIp } from './security';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getIpFromRequest(req: Request): string {
  return extractClientIp(req);
}

/**
 * Calculates Dew Point in Celsius using the Magnus-Tetens approximation.
 * b = 17.27, c = 237.7 °C
 * gamma(T, RH) = (b * T) / (c + T) + ln(RH / 100)
 * Tdp = (c * gamma) / (b - gamma)
 */
export function calculateDewPoint(tempC: number, humidityRH: number): number | null {
  if (tempC === -999 || humidityRH === -1 || isNaN(tempC) || isNaN(humidityRH) || humidityRH <= 0) {
    return null;
  }
  const b = 17.27;
  const c = 237.7;
  const gamma = (b * tempC) / (c + tempC) + Math.log(humidityRH / 100);
  const dewPoint = (c * gamma) / (b - gamma);
  return Math.round(dewPoint * 10) / 10;
}

/**
 * Calculates comfort and condensation / mold risk metrics
 */
export function getComfortMetrics(tempC: number, humidityRH: number): ComfortMetrics {
  const dewPoint = calculateDewPoint(tempC, humidityRH);

  if (dewPoint === null || tempC === -999 || humidityRH === -1) {
    return {
      dewPoint: 0,
      isCondensationRisk: false,
      tempMarginToDewPoint: 0,
      humidityStatus: 'yellow',
      comfortDescription: 'Lectura de sensores no disponible temporalmente',
    };
  }

  const margin = Math.round((tempC - dewPoint) * 10) / 10;
  const isCondensationRisk = margin <= 2.0;

  let humidityStatus: 'green' | 'yellow' | 'red' = 'green';
  let comfortDescription = 'Ambiente de cabina óptimo. Aire seco y seguro.';

  if (humidityRH > 75) {
    humidityStatus = 'red';
    comfortDescription = 'Humedad crítica: Riesgo para velas, colchonetas y electrónica. Se aconseja ventilar el barco.';
  } else if (humidityRH >= 65) {
    humidityStatus = 'yellow';
    comfortDescription = 'Humedad elevada: Controlar ventilación y circulación de aire en cabina.';
  }

  return {
    dewPoint,
    isCondensationRisk,
    tempMarginToDewPoint: margin,
    humidityStatus,
    comfortDescription,
  };
}

/**
 * Calculates battery metrics for a 12V marine battery setup.
 * Handles missing / null voltage gracefully.
 */
export function getBatteryMetrics(voltage?: number | null): BatteryMetrics {
  if (voltage === undefined || voltage === null || isNaN(voltage) || voltage <= 0) {
    return {
      hasVoltage: false,
      voltage: null,
      percentage: null,
      estimatedHoursRemaining: null,
      status: 'unknown',
    };
  }

  // 12V Lead-Acid / AGM estimated State of Charge (SoC) lookup
  let percentage = 0;
  if (voltage >= 12.75) {
    percentage = 100;
  } else if (voltage >= 12.5) {
    percentage = 85 + ((voltage - 12.5) / 0.25) * 15;
  } else if (voltage >= 12.3) {
    percentage = 70 + ((voltage - 12.3) / 0.2) * 15;
  } else if (voltage >= 12.1) {
    percentage = 50 + ((voltage - 12.1) / 0.2) * 20;
  } else if (voltage >= 11.9) {
    percentage = 25 + ((voltage - 11.9) / 0.2) * 25;
  } else if (voltage >= 11.6) {
    percentage = 10 + ((voltage - 11.6) / 0.3) * 15;
  } else if (voltage > 10.5) {
    percentage = ((voltage - 10.5) / 1.1) * 10;
  } else {
    percentage = 0;
  }

  percentage = Math.max(0, Math.min(100, Math.round(percentage)));

  // Usable Ah estimation for 12V 80Ah reserve
  const usableAmpHours = (percentage / 100) * 80;
  const avgDrawAmps = 0.05; // 50mA average with deep sleep cycles
  const estimatedHoursRemaining = Math.round(usableAmpHours / avgDrawAmps);

  let status: 'good' | 'warning' | 'critical' = 'good';
  if (voltage < 11.8 || percentage < 20) {
    status = 'critical';
  } else if (voltage < 12.2 || percentage < 50) {
    status = 'warning';
  }

  return {
    hasVoltage: true,
    voltage: Math.round(voltage * 100) / 100,
    percentage,
    estimatedHoursRemaining,
    status,
  };
}

/**
 * Calculates Dead Man's Switch / Connection Watchdog status
 * Triggers alert if 2 consecutive expected reports are missed.
 */
export function calculateWatchdogStatus(
  lastReceivedAt: string | Date | number | null,
  expectedIntervalMinutes: number = 480
): WatchdogStatus {
  if (!lastReceivedAt) {
    return {
      isOnline: false,
      isWarning: true,
      isDeadManTriggered: true,
      lastReadingAt: null,
      expectedIntervalMinutes,
      missedIntervalsCount: 2,
      minutesSinceLastReading: 9999,
      nextExpectedReportAt: null,
    };
  }

  const lastTime = new Date(lastReceivedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - lastTime);
  const minutesSinceLastReading = Math.floor(diffMs / (60 * 1000));

  const missedIntervalsCount = Math.floor(minutesSinceLastReading / expectedIntervalMinutes);
  const isDeadManTriggered = missedIntervalsCount >= 2;
  const isWarning = minutesSinceLastReading > expectedIntervalMinutes * 1.25;
  const isOnline = !isDeadManTriggered && !isWarning;

  const nextExpectedMs = lastTime + expectedIntervalMinutes * 60 * 1000;

  return {
    isOnline,
    isWarning,
    isDeadManTriggered,
    lastReadingAt: new Date(lastReceivedAt).toISOString(),
    expectedIntervalMinutes,
    missedIntervalsCount,
    minutesSinceLastReading,
    nextExpectedReportAt: new Date(nextExpectedMs).toISOString(),
  };
}

export function formatTimeAgo(dateInput: string | Date | number | null): string {
  if (!dateInput) return 'Nunca';
  const time = new Date(dateInput).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h ${diffMin % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays}d ${diffHours % 24}h`;
}
