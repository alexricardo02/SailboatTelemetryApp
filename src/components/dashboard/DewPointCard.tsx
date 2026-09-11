'use client';

import React from 'react';
import { ComfortMetrics } from '@/types';
import { Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface DewPointCardProps {
  metrics: ComfortMetrics | null;
  tempC?: number;
}

export function DewPointCard({ metrics, tempC }: DewPointCardProps) {
  if (!metrics) return null;

  const { dewPoint, isCondensationRisk, tempMarginToDewPoint } = metrics;

  return (
    <div
      className={`hud-card transition-all duration-200 ${
        isCondensationRisk
          ? 'border-hud-warning/80 bg-hud-warning/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'hover:border-accent/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-lg border ${
              isCondensationRisk
                ? 'bg-hud-warning/20 text-hud-warning border-hud-warning/40'
                : 'bg-teal-500/15 text-teal-400 border-teal-500/30'
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">
              Punto de Rocío y Riesgo de Humedad
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono">Control de Humedad y Condensación</p>
          </div>
        </div>

        {isCondensationRisk ? (
          <span className="hud-badge bg-hud-warning/20 text-hud-warning border-hud-warning/40 animate-pulse motion-reduce:animate-none font-mono">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Alerta de Condensación
          </span>
        ) : (
          <span className="hud-badge bg-hud-success/15 text-hud-success border-hud-success/30 font-mono">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Margen Seguro
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-background/80 rounded-lg p-3 border border-border">
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
            Punto de Rocío
          </span>
          <p className="hud-stat-value text-xl sm:text-2xl text-foreground font-mono mt-1">
            {dewPoint.toFixed(1)}°C
          </p>
        </div>

        <div className="bg-background/80 rounded-lg p-3 border border-border">
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
            Margen Térmico
          </span>
          <p
            className={`hud-stat-value text-xl sm:text-2xl font-mono mt-1 ${
              isCondensationRisk ? 'text-hud-warning font-black' : 'text-hud-success'
            }`}
          >
            +{tempMarginToDewPoint.toFixed(1)}°C
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-background/80 rounded-lg p-3 border border-border">
          <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
            Límite de Alerta
          </span>
          <p className="hud-stat-value text-xl sm:text-2xl text-muted-foreground font-mono mt-1">
            2.0°C
          </p>
        </div>
      </div>

      {isCondensationRisk ? (
        <div className="mt-4 rounded-lg bg-hud-warning/15 border border-hud-warning/40 p-3.5 text-xs text-foreground leading-relaxed font-mono">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-hud-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-heading font-bold text-hud-warning text-sm">
                Riesgo de condensación: ¡se recomienda ventilar la cabina!
              </p>
              <p className="mt-1 text-foreground/90 text-[11px]">
                La temperatura de cabina está a solo <strong className="text-hud-warning">{tempMarginToDewPoint.toFixed(1)}°C</strong> del punto de rocío. Podría formarse condensación sobre el casco, mamparos y pasacascos.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-background/60 border border-border p-3 text-xs text-muted-foreground flex items-center space-x-2.5 font-mono">
          <Info className="h-4 w-4 text-accent flex-shrink-0" />
          <span className="text-[11px]">
            Cabina protegida: el aire está <strong className="text-foreground">+{tempMarginToDewPoint.toFixed(1)}°C</strong> por encima del punto de condensación.
          </span>
        </div>
      )}
    </div>
  );
}

