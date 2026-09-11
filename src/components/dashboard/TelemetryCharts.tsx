'use client';

import React, { useState } from 'react';
import { TelemetryReading } from '@/types';
import { calculateDewPoint } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface TelemetryChartsProps {
  readings: TelemetryReading[];
  selectedRange: '24h' | '7d' | '30d' | 'all';
  onRangeChange: (range: '24h' | '7d' | '30d' | 'all') => void;
}

export function TelemetryCharts({ readings, selectedRange, onRangeChange }: TelemetryChartsProps) {
  const { isNight } = useTheme();
  const [activeTab, setActiveTab] = useState<'both' | 'temp' | 'humidity'>('both');

  // Format data for Recharts (oldest to newest)
  const chartData = [...readings]
    .filter((r) => r.temperature !== -999 && r.humidity !== -1)
    .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
    .map((r) => {
      const date = new Date(r.receivedAt);
      const dewPoint = calculateDewPoint(r.temperature, r.humidity);
      return {
        timestamp: date.getTime(),
        timeStr:
          selectedRange === '24h'
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
        temperature: r.temperature,
        humidity: r.humidity,
        dewPoint: dewPoint !== null ? dewPoint : undefined,
        voltage: r.voltage || undefined,
        bilgeAlert: r.bilgeAlert,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="hud-card text-center p-6 text-muted-foreground text-xs font-mono">
        No se registran datos en el período seleccionado ({selectedRange}).
      </div>
    );
  }

  return (
    <div className="hud-card p-5 space-y-4 hover:border-accent/50 transition-all duration-200">
      {/* Header with Range Filter & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-accent/15 text-accent border border-accent/30 flex-shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">
              Tendencias y Clima de Cabina
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono">Evolución de Temperatura, Humedad y Punto de Rocío</p>
          </div>
        </div>

        {/* Range Selector Buttons */}
        <div className="flex items-center space-x-1 self-start sm:self-auto bg-background/90 p-1 rounded-lg border border-border">
          {(['24h', '7d', '30d', 'all'] as const).map((rng) => (
            <button
              key={rng}
              onClick={() => onRangeChange(rng)}
              className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                selectedRange === rng
                  ? 'bg-accent text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {rng === 'all' ? 'Todo' : rng === '24h' ? '24h' : rng === '7d' ? '7d' : '30d'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Mode Filter Tabs */}
      <div className="flex items-center space-x-3 sm:space-x-4 border-b border-border pb-2 text-xs font-heading font-semibold overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('both')}
          className={`pb-1 transition-all duration-200 cursor-pointer border-b-2 flex-shrink-0 ${
            activeTab === 'both'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Vista Combinada
        </button>
        <button
          onClick={() => setActiveTab('temp')}
          className={`pb-1 transition-all duration-200 cursor-pointer border-b-2 flex-shrink-0 ${
            activeTab === 'temp'
              ? 'border-orange-400 text-orange-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Temp. y Rocío (°C)
        </button>
        <button
          onClick={() => setActiveTab('humidity')}
          className={`pb-1 transition-all duration-200 cursor-pointer border-b-2 flex-shrink-0 ${
            activeTab === 'humidity'
              ? 'border-cyan-400 text-cyan-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Humedad (% HR)
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="h-56 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorDew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={isNight ? '#3B0808' : '#1E293B'} opacity={0.8} />
            <XAxis
              dataKey="timeStr"
              stroke={isNight ? '#EF4444' : '#94A3B8'}
              fontSize={11}
              fontFamily="var(--font-roboto-mono)"
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke={isNight ? '#F87171' : '#94A3B8'}
              fontSize={11}
              fontFamily="var(--font-roboto-mono)"
              tickLine={false}
              domain={['auto', 'auto']}
            />
            {activeTab === 'both' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={isNight ? '#F87171' : '#3B82F6'}
                fontSize={11}
                fontFamily="var(--font-roboto-mono)"
                tickLine={false}
                domain={[0, 100]}
              />
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: isNight ? '#080000' : '#1E1E23',
                borderColor: isNight ? '#7F1D1D' : '#1E293B',
                borderRadius: '0.5rem',
                fontSize: '12px',
                fontFamily: 'var(--font-roboto-mono)',
                color: isNight ? '#FCA5A5' : '#F8FAFC',
                boxShadow: '0 4px 15px rgba(0,0,0,0.7)',
              }}
              labelStyle={{ color: isNight ? '#F87171' : '#F8FAFC', marginBottom: '4px', fontWeight: 'bold' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-roboto-mono)', paddingTop: '8px' }}
            />

            {(activeTab === 'both' || activeTab === 'temp') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name="Temp. Cabina (°C)"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTemp)"
              />
            )}

            {(activeTab === 'both' || activeTab === 'temp') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="dewPoint"
                name="Punto de Rocío (°C)"
                stroke="#14b8a6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorDew)"
              />
            )}

            {(activeTab === 'both' || activeTab === 'humidity') && (
              <Area
                yAxisId={activeTab === 'both' ? 'right' : 'left'}
                type="monotone"
                dataKey="humidity"
                name="Humedad (% HR)"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHumid)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

