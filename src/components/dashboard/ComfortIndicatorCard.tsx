'use client';

import React from 'react';
import { ComfortMetrics } from '@/types';
import { Wind, Layers, Cpu, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ComfortCardProps {
  metrics: ComfortMetrics | null;
  humidity?: number;
}

export function ComfortIndicatorCard({ metrics, humidity }: ComfortCardProps) {
  if (!metrics) return null;

  const { humidityStatus, comfortDescription } = metrics;

  return (
    <div className="hud-card hover:border-accent/50 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-accent/15 text-accent border border-accent/30">
            <Wind className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">
              Cuidado y Preservación del Barco
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono">Velas, Colchonetas e Instrumental</p>
          </div>
        </div>

        {/* Traffic Light Status Pill */}
        <div className="flex items-center space-x-2 bg-background/80 px-3 py-1 rounded-lg border border-border">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              humidityStatus === 'green'
                ? 'bg-hud-success shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                : 'bg-muted-foreground/30'
            }`}
          />
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              humidityStatus === 'yellow'
                ? 'bg-hud-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                : 'bg-muted-foreground/30'
            }`}
          />
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              humidityStatus === 'red'
                ? 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse motion-reduce:animate-none'
                : 'bg-muted-foreground/30'
            }`}
          />
          <span
            className={`text-xs font-mono font-bold uppercase tracking-wider ${
              humidityStatus === 'green'
                ? 'text-hud-success'
                : humidityStatus === 'yellow'
                ? 'text-hud-warning'
                : 'text-destructive'
            }`}
          >
            {humidityStatus === 'green'
              ? 'Óptimo'
              : humidityStatus === 'yellow'
              ? 'Elevado'
              : 'Crítico'}
          </span>
        </div>
      </div>

      {/* Preservation Assessment Details */}
      <div className="mt-4 p-4 rounded-lg bg-background/80 border border-border">
        <div className="flex items-start space-x-3">
          {humidityStatus === 'green' && (
            <CheckCircle2 className="h-4 w-4 text-hud-success flex-shrink-0 mt-0.5" />
          )}
          {humidityStatus === 'yellow' && (
            <AlertTriangle className="h-4 w-4 text-hud-warning flex-shrink-0 mt-0.5" />
          )}
          {humidityStatus === 'red' && (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          )}
          <div className="w-full">
            <p className="text-xs font-mono font-medium text-foreground">{comfortDescription}</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="bg-card p-2.5 rounded-lg border border-border">
                <div className="flex items-center space-x-1.5 text-muted-foreground mb-1">
                  <Wind className="h-3.5 w-3.5 text-accent" />
                  <span className="font-heading font-semibold">Velas y Jarcia</span>
                </div>
                <span className={humidityStatus === 'red' ? 'text-destructive font-bold' : 'text-foreground'}>
                  {humidityStatus === 'red' ? 'Riesgo de Moho' : 'Protegidas'}
                </span>
              </div>
              <div className="bg-card p-2.5 rounded-lg border border-border">
                <div className="flex items-center space-x-1.5 text-muted-foreground mb-1">
                  <Layers className="h-3.5 w-3.5 text-accent" />
                  <span className="font-heading font-semibold">Colchonetas</span>
                </div>
                <span className={humidityStatus === 'red' ? 'text-destructive font-bold' : 'text-foreground'}>
                  {humidityStatus === 'red' ? 'Riesgo de Humedad' : 'Secas'}
                </span>
              </div>
              <div className="bg-card p-2.5 rounded-lg border border-border">
                <div className="flex items-center space-x-1.5 text-muted-foreground mb-1">
                  <Cpu className="h-3.5 w-3.5 text-accent" />
                  <span className="font-heading font-semibold">Electrónica</span>
                </div>
                <span className={humidityStatus === 'red' ? 'text-destructive font-bold' : 'text-foreground'}>
                  {humidityStatus === 'red' ? 'Riesgo de Sulfatación' : 'Segura'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

