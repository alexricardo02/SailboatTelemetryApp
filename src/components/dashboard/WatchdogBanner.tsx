'use client';

import React from 'react';
import { WatchdogStatus } from '@/types';
import { AlertOctagon, AlertTriangle, RefreshCw, Radio, ZapOff, WifiOff } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

interface WatchdogBannerProps {
  watchdog: WatchdogStatus;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function WatchdogBanner({ watchdog, onRefresh, isLoading }: WatchdogBannerProps) {
  if (!watchdog.isDeadManTriggered && !watchdog.isWarning) {
    return null;
  }

  const hoursMissed = Math.round((watchdog.minutesSinceLastReading / 60) * 10) / 10;
  const expectedHours = Math.round((watchdog.expectedIntervalMinutes / 60) * 10) / 10;

  if (watchdog.isDeadManTriggered) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-destructive/80 bg-destructive/10 p-4 sm:p-5 shadow-hud-alert mb-6 transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive border border-destructive/50">
              <AlertOctagon className="h-6 w-6 motion-reduce:animate-none animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-bold text-destructive tracking-wide">
                  ALERTA: BARCO SIN COMUNICACIÓN / POSIBLE BATERÍA DESCARGADA
                </h3>
                <span className="hud-badge bg-destructive text-black font-mono font-bold">
                  Sin Señal del Barco
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-foreground/90 font-mono leading-relaxed">
                El velero perdió <strong className="text-destructive font-bold">{watchdog.missedIntervalsCount} envíos consecutivos</strong>.
                Último contacto recibido: <strong className="text-foreground">{formatTimeAgo(watchdog.lastReadingAt)}</strong> ({hoursMissed}h atrás, frecuencia configurada: cada {expectedHours}h).
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-card border border-destructive/40 text-destructive">
                  <ZapOff className="mr-1.5 h-3.5 w-3.5" />
                  Posible descarga de batería o panel solar
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-card border border-destructive/40 text-destructive">
                  <WifiOff className="mr-1.5 h-3.5 w-3.5" />
                  Comprobar señal o cobertura en la marina
                </span>
              </div>
            </div>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="btn-primary bg-destructive hover:bg-destructive/90 text-white font-heading font-semibold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 self-start sm:self-center flex-shrink-0"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Consultar Estado
            </button>
          )}
        </div>
      </div>
    );
  }

  // Warning state (delayed report)
  return (
    <div className="relative overflow-hidden rounded-xl border border-hud-warning/60 bg-hud-warning/10 p-4 mb-6 transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-hud-warning/20 text-hud-warning border border-hud-warning/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-bold text-hud-warning tracking-wide">
              Reporte Demorado ({hoursMissed}h desde el último reporte)
            </h4>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              El próximo reporte automático se esperaba alrededor de las {watchdog.nextExpectedReportAt ? new Date(watchdog.nextExpectedReportAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recientemente'}.
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-card hover:bg-muted border border-hud-warning/40 text-hud-warning text-xs transition cursor-pointer"
            title="Actualizar estado"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

