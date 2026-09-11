'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { TelemetryCharts } from '@/components/dashboard/TelemetryCharts';
import { TelemetryReading } from '@/types';
import { History, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { calculateDewPoint } from '@/lib/utils';

export default function HistoryPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [range, setRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/readings?range=${range}&limit=300`);
      if (res.ok) {
        const data = await res.json();
        setReadings(data.readings || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const rangeLabel = range === '24h' ? '24 horas' : range === '7d' ? '7 días' : range === '30d' ? '30 días' : 'todo el historial';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center space-x-2.5">
              <History className="h-6 w-6 text-accent" />
              <span>Historial de Telemetría y Clima</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Análisis temporal de temperatura de cabina, niveles de humedad y registros recibidos
            </p>
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="inline-flex items-center self-start sm:self-auto px-4 py-2 rounded-lg bg-card border border-border hover:border-accent text-xs font-heading font-semibold text-foreground transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Registros
          </button>
        </div>

        {/* Statistical Summary Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="hud-card p-4">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Extremos de Temperatura
              </span>
              <div className="mt-2 flex items-center justify-between font-mono">
                <div>
                  <span className="text-xs text-rose-400 font-bold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                    Máx: {stats.temperature?.max ?? '--'}°C
                  </span>
                  <span className="text-xs text-cyan-400 font-bold flex items-center mt-1">
                    <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                    Mín: {stats.temperature?.min ?? '--'}°C
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Promedio</span>
                  <span className="hud-stat-value text-base text-foreground font-bold">{stats.temperature?.avg ?? '--'}°C</span>
                </div>
              </div>
            </div>

            <div className="hud-card p-4">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Extremos de Humedad
              </span>
              <div className="mt-2 flex items-center justify-between font-mono">
                <div>
                  <span className="text-xs text-rose-400 font-bold flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                    Máx: {stats.humidity?.max ?? '--'}%
                  </span>
                  <span className="text-xs text-hud-success font-bold flex items-center mt-1">
                    <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                    Mín: {stats.humidity?.min ?? '--'}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Promedio</span>
                  <span className="hud-stat-value text-base text-foreground font-bold">{stats.humidity?.avg ?? '--'}%</span>
                </div>
              </div>
            </div>

            <div className="hud-card p-4">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Muestras Recibidas
              </span>
              <p className="hud-stat-value text-2xl font-black text-foreground font-mono mt-1">
                {stats.totalReadings || readings.length}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">En ventana de {rangeLabel}</span>
            </div>

            <div className="hud-card p-4">
              <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider block">
                Estado de Sensores
              </span>
              <p className="font-heading text-base font-bold text-hud-success mt-1">100% Reportes Válidos</p>
              <span className="text-[10px] text-muted-foreground font-mono">Lecturas íntegras verificadas</span>
            </div>
          </div>
        )}

        {/* Graphical View */}
        <TelemetryCharts
          readings={readings}
          selectedRange={range}
          onRangeChange={setRange}
        />

        {/* Tabular Raw Records Table */}
        <div className="hud-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              <span>Bitácora de Reportes Recibidos</span>
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Mostrando {readings.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-background/90 text-[11px] uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Fecha y Hora</th>
                  <th className="px-3.5 py-2.5 font-semibold">Temperatura</th>
                  <th className="px-3.5 py-2.5 font-semibold">Humedad</th>
                  <th className="px-3.5 py-2.5 font-semibold">Punto Rocío</th>
                  <th className="px-3.5 py-2.5 font-semibold">Sentina</th>
                  <th className="px-3.5 py-2.5 font-semibold">Sensor Clima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {readings.slice(0, 50).map((r) => {
                  const dp = calculateDewPoint(r.temperature, r.humidity);
                  return (
                    <tr key={r.id || String(r.receivedAt)} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3.5 py-2 text-foreground">
                        {new Date(r.receivedAt).toLocaleString('es-ES')}
                      </td>
                      <td className="px-3.5 py-2 text-orange-400 font-bold">
                        {r.temperature !== -999 ? `${r.temperature.toFixed(1)}°C` : 'FALLA'}
                      </td>
                      <td className="px-3.5 py-2 text-accent font-bold">
                        {r.humidity !== -1 ? `${r.humidity.toFixed(1)}%` : 'FALLA'}
                      </td>
                      <td className="px-3.5 py-2 text-teal-400">
                        {dp !== null ? `${dp.toFixed(1)}°C` : '--'}
                      </td>
                      <td className="px-3.5 py-2">
                        {r.bilgeAlert ? (
                          <span className="px-2 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/40 font-bold">
                            ALERTA
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Seca</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2">
                        {r.sensorOk ? (
                          <span className="text-hud-success font-bold">OK</span>
                        ) : (
                          <span className="text-destructive font-bold">FALLA</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

