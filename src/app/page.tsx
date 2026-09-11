'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WatchdogBanner } from '@/components/dashboard/WatchdogBanner';
import { LiveOverviewCard } from '@/components/dashboard/LiveOverviewCard';
import { DewPointCard } from '@/components/dashboard/DewPointCard';
import { ComfortIndicatorCard } from '@/components/dashboard/ComfortIndicatorCard';
import { BatteryAutonomyCard } from '@/components/dashboard/BatteryAutonomyCard';
import { TelemetryCharts } from '@/components/dashboard/TelemetryCharts';
import { TelemetryReading, ComfortMetrics, BatteryMetrics, WatchdogStatus } from '@/types';

export default function DashboardPage() {
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [latestReading, setLatestReading] = useState<TelemetryReading | null>(null);
  const [comfort, setComfort] = useState<ComfortMetrics | null>(null);
  const [battery, setBattery] = useState<BatteryMetrics | null>(null);
  const [watchdog, setWatchdog] = useState<WatchdogStatus>({
    isOnline: true,
    isWarning: false,
    isDeadManTriggered: false,
    lastReadingAt: null,
    expectedIntervalMinutes: 480,
    missedIntervalsCount: 0,
    minutesSinceLastReading: 0,
    nextExpectedReportAt: null,
  });
  const [range, setRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/readings?range=${range}&limit=150`);
      if (res.ok) {
        const data = await res.json();
        setReadings(data.readings || []);
        setLatestReading(data.latest || null);
        setComfort(data.comfort || null);
        setBattery(data.battery || null);
        if (data.watchdog) {
          setWatchdog(data.watchdog);
        }
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchTelemetry();
    // Auto-poll every 60 seconds
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar watchdogStatus={watchdog} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Watchdog Alert Banner (Dead Man's Switch) */}
        <WatchdogBanner watchdog={watchdog} onRefresh={fetchTelemetry} isLoading={loading} />

        {/* 1. Live Telemetry Instrument Readouts */}
        <section aria-label="Real-time Sensor Overview">
          <LiveOverviewCard
            reading={latestReading}
            onRefresh={fetchTelemetry}
            isLoading={loading}
          />
        </section>

        {/* 2. Psychrometric Dew Point & Preservation Assessment */}
        <section aria-label="Psychrometric Environment" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <DewPointCard
            metrics={comfort}
            tempC={latestReading ? latestReading.temperature : undefined}
          />
          <ComfortIndicatorCard
            metrics={comfort}
            humidity={latestReading ? latestReading.humidity : undefined}
          />
        </section>

        {/* 3. Station Power & Battery Autonomy */}
        <section aria-label="Power & Battery Telemetry">
          <BatteryAutonomyCard metrics={battery} />
        </section>

        {/* 4. Longitudinal Telemetry Charts */}
        <section aria-label="Historical Telemetry Trends">
          <TelemetryCharts
            readings={readings}
            selectedRange={range}
            onRangeChange={setRange}
          />
        </section>
      </main>
    </div>
  );
}

