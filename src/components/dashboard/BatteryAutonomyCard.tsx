'use client';

import React, { useState } from 'react';
import { BatteryMetrics } from '@/types';
import { Battery, Zap, Cpu, Activity } from 'lucide-react';
import { getBatteryMetrics } from '@/lib/utils';

interface BatteryCardProps {
  metrics: BatteryMetrics | null;
}

export function BatteryAutonomyCard({ metrics }: BatteryCardProps) {
  const [simulateVoltage, setSimulateVoltage] = useState<boolean>(false);
  const [simVoltageVal, setSimVoltageVal] = useState<number>(12.5);

  const activeMetrics = simulateVoltage
    ? getBatteryMetrics(simVoltageVal)
    : metrics || getBatteryMetrics(null);

  return (
    <div className="hud-card hover:border-accent/50 transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Battery className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">
              Batería de Servicio y Autonomía
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono">Banco de 12V / Reserva Solar</p>
          </div>
        </div>

        {/* Firmware Notice / Simulation Toggle */}
        <button
          onClick={() => setSimulateVoltage(!simulateVoltage)}
          className={`px-3 py-1.5 rounded-lg border font-heading text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
            simulateVoltage
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          {simulateVoltage ? 'Simulando 12V' : 'Simular Prueba de 12V'}
        </button>
      </div>

      {activeMetrics.hasVoltage && activeMetrics.voltage !== null ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-background/80 rounded-lg p-3.5 border border-border">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Voltaje Medido
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="hud-stat-value text-2xl sm:text-3xl text-foreground font-mono">
                  {activeMetrics.voltage.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground font-mono font-bold">V CC</span>
              </div>
            </div>

            <div className="bg-background/80 rounded-lg p-3.5 border border-border">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Nivel de Carga
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span
                  className={`hud-stat-value text-2xl sm:text-3xl font-mono ${
                    activeMetrics.percentage && activeMetrics.percentage < 25
                      ? 'text-destructive font-black'
                      : activeMetrics.percentage && activeMetrics.percentage < 50
                      ? 'text-hud-warning font-black'
                      : 'text-hud-success font-black'
                  }`}
                >
                  {activeMetrics.percentage}%
                </span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-background/80 rounded-lg p-3.5 border border-border">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Autonomía Estimada
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="hud-stat-value text-2xl sm:text-3xl text-foreground font-mono">
                  {activeMetrics.estimatedHoursRemaining
                    ? Math.round(activeMetrics.estimatedHoursRemaining / 24)
                    : '--'}
                </span>
                <span className="text-xs text-muted-foreground font-mono font-bold">días</span>
              </div>
            </div>
          </div>

          {/* SoC Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span className="uppercase tracking-wider">Indicador de Capacidad</span>
              <span className="font-bold text-foreground">{activeMetrics.percentage}% disponible</span>
            </div>
            <div className="h-3.5 w-full bg-background rounded-full overflow-hidden border border-border p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeMetrics.percentage && activeMetrics.percentage < 25
                    ? 'bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : activeMetrics.percentage && activeMetrics.percentage < 50
                    ? 'bg-hud-warning shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-hud-success shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                }`}
                style={{ width: `${activeMetrics.percentage}%` }}
              />
            </div>
          </div>

          {simulateVoltage && (
            <div className="p-3.5 bg-background/90 rounded-lg border border-border text-xs font-mono space-y-2">
              <div className="flex justify-between text-[11px] text-foreground">
                <span>Ajustar Voltaje de Prueba:</span>
                <span className="font-bold text-accent">{simVoltageVal.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="10.8"
                max="13.2"
                step="0.05"
                value={simVoltageVal}
                onChange={(e) => setSimVoltageVal(parseFloat(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>
          )}
        </div>
      ) : (
        /* Graceful "No Data Yet" State */
        <div className="mt-4 p-4 rounded-lg bg-background/80 border border-border text-xs font-mono">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-card border border-border text-muted-foreground flex-shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-foreground">
                Medición de Batería en Preparación
              </h4>
              <p className="mt-1 text-muted-foreground leading-relaxed text-[11px]">
                La estación actualmente monitorea temperatura, humedad y sentina. Al conectar la toma de 12V al sensor, verás el nivel de carga y consumo de la batería en tiempo real.
              </p>
              <div className="mt-2.5 flex items-center space-x-2 text-[11px] text-accent">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span>
                <span>Módulo de batería activo y calibrado en la app</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

