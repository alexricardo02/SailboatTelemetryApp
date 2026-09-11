'use client';

import React, { useEffect, useState } from 'react';
import { TelemetryReading } from '@/types';
import { formatTimeAgo, calculateDewPoint } from '@/lib/utils';
import {
  Thermometer,
  Droplets,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Snowflake,
  SunMedium,
  AlertTriangle,
  Radio,
  Activity,
} from 'lucide-react';

interface LiveOverviewProps {
  reading: TelemetryReading | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function LiveOverviewCard({ reading, onRefresh, isLoading }: LiveOverviewProps) {
  const [timeAgo, setTimeAgo] = useState<string>('Never');

  useEffect(() => {
    if (!reading) return;
    const update = () => setTimeAgo(formatTimeAgo(reading.receivedAt));
    update();
    const interval = setInterval(update, 10000); // update every 10s
    return () => clearInterval(interval);
  }, [reading]);

  if (!reading) {
    return (
      <div className="hud-card text-center p-8">
        <Clock className="mx-auto h-10 w-10 text-muted-foreground animate-pulse mb-3" />
        <h3 className="font-heading text-lg font-bold text-foreground">Esperando Primer Reporte del Barco</h3>
        <p className="text-xs text-muted-foreground font-mono mt-1.5 max-w-md mx-auto">
          La estación del velero aún no ha transmitido datos. Enciende el equipo a bordo o realiza una transmisión de prueba.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="btn-primary mt-5"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Comprobar Conexión
          </button>
        )}
      </div>
    );
  }

  const isTempValid = reading.temperature !== -999;
  const isHumidValid = reading.humidity !== -1;
  const dewPoint = calculateDewPoint(reading.temperature, reading.humidity);
  const formattedDate = new Date(reading.receivedAt).toLocaleDateString('es-ES', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date(reading.receivedAt).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* HUD Telemetry Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-hud-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-hud-success"></span>
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
              Último Reporte del Barco:
            </span>
            <span className="font-mono text-xs font-semibold text-accent">
              {timeAgo}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              ({formattedDate} · {formattedTime})
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Sensor status */}
          <span
            className={`hud-badge ${
              reading.sensorOk
                ? 'bg-hud-success/15 text-hud-success border-hud-success/30'
                : 'bg-destructive/20 text-destructive border-destructive/40'
            }`}
          >
            {reading.sensorOk ? (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-hud-success" />
                Sensor Temp. y Hum. OK
              </>
            ) : (
              <>
                <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-destructive" />
                Falla en Sensor
              </>
            )}
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Actualizar datos"
              className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Telemetry Instrument Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Temperature Readout */}
        <div className="hud-card p-5 hover:border-accent/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Temp. Interior
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Sensor Cabina</span>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="hud-stat-value text-3xl sm:text-4xl text-foreground font-mono">
                {isTempValid ? reading.temperature.toFixed(1) : '--'}
              </span>
              <span className="text-lg font-bold text-muted-foreground font-mono">°C</span>
              {isTempValid && (
                <span className="text-xs text-muted-foreground font-mono ml-2">
                  ({((reading.temperature * 9) / 5 + 32).toFixed(1)}°F)
                </span>
              )}
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-[11px] font-mono gap-1">
              <span className="text-muted-foreground inline-flex items-center min-w-0 truncate">
                {isTempValid ? (
                  reading.temperature < 5 ? (
                    <>
                      <Snowflake className="mr-1 h-3 w-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">Riesgo Escarcha</span>
                    </>
                  ) : reading.temperature > 30 ? (
                    <>
                      <SunMedium className="mr-1 h-3 w-3 text-orange-400 flex-shrink-0" />
                      <span className="truncate">Calor en Cabina</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3 text-hud-success flex-shrink-0" />
                      <span className="truncate">Rango Confortable</span>
                    </>
                  )
                ) : (
                  'Falla de Sensor'
                )}
              </span>
              <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Humidity Readout */}
        <div className="hud-card p-4 sm:p-5 hover:border-accent/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Humedad Cabina
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Humedad Relativa (% HR)</span>
            </div>
            <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/30">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="hud-stat-value text-3xl sm:text-4xl text-foreground font-mono">
                {isHumidValid ? reading.humidity.toFixed(1) : '--'}
              </span>
              <span className="text-lg font-bold text-muted-foreground font-mono">%</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-[11px] font-mono gap-1">
              <span className="text-muted-foreground inline-flex items-center min-w-0 truncate">
                {isHumidValid ? (
                  reading.humidity > 75 ? (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3 text-destructive flex-shrink-0" />
                      <span className="truncate">Riesgo Moho (&gt;75%)</span>
                    </>
                  ) : reading.humidity >= 65 ? (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3 text-hud-warning flex-shrink-0" />
                      <span className="truncate">Humedad Elevada</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1 h-3 w-3 text-hud-success flex-shrink-0" />
                      <span className="truncate">Ambiente Seco</span>
                    </>
                  )
                ) : (
                  'Falla de Sensor'
                )}
              </span>
              <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Bilge Float Switch */}
        <div
          className={`hud-card p-4 sm:p-5 transition-all duration-200 ${
            reading.bilgeAlert
              ? 'border-destructive bg-destructive/10 shadow-hud-alert'
              : 'hover:border-accent/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Nivel de Sentina
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Sensor Flotante</span>
            </div>
            <div
              className={`p-2 rounded-lg border ${
                reading.bilgeAlert
                  ? 'bg-destructive/20 text-destructive border-destructive/40'
                  : 'bg-hud-success/15 text-hud-success border-hud-success/30'
              }`}
            >
              {reading.bilgeAlert ? (
                <ShieldAlert className="h-4 w-4 motion-reduce:animate-none animate-pulse" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span
                className={`hud-stat-value text-2xl font-black tracking-tight font-heading ${
                  reading.bilgeAlert
                    ? 'text-destructive animate-pulse motion-reduce:animate-none'
                    : 'text-hud-success'
                }`}
              >
                {reading.bilgeAlert ? 'AGUA DETECTADA' : 'SENTINA SECA'}
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-[11px] font-mono gap-1">
              <span className={`min-w-0 truncate ${reading.bilgeAlert ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                {reading.bilgeAlert ? 'Flotante Activado' : 'Flotante Normal'}
              </span>
              <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Calculated Dew Point */}
        <div className="hud-card p-4 sm:p-5 hover:border-accent/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Punto de Rocío
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Cálculo de Saturación</span>
            </div>
            <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="hud-stat-value text-3xl sm:text-4xl text-foreground font-mono">
                {dewPoint !== null ? dewPoint.toFixed(1) : '--'}
              </span>
              <span className="text-lg font-bold text-muted-foreground font-mono">°C</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-[11px] font-mono gap-1">
              <span className="text-muted-foreground min-w-0 truncate">
                {dewPoint !== null && isTempValid
                  ? `Margen: +${(reading.temperature - dewPoint).toFixed(1)}°C`
                  : 'No disponible'}
              </span>
              <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


