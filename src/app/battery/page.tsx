'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BatteryAutonomyCard } from '@/components/dashboard/BatteryAutonomyCard';
import { BatteryMetrics } from '@/types';
import { Battery, Zap, Cpu } from 'lucide-react';

export default function BatteryPage() {
  const [battery, setBattery] = useState<BatteryMetrics | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/readings?range=24h');
        if (res.ok) {
          const data = await res.json();
          setBattery(data.battery || null);
        }
      } catch (e) {
        console.error('Failed to load battery state:', e);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center space-x-2.5">
            <Battery className="h-6 w-6 text-amber-400" />
            <span>Energía y Batería de Servicio</span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Control del banco de baterías de 12V, reserva solar y perfil de consumo del velero
          </p>
        </div>

        <BatteryAutonomyCard metrics={battery} />

        {/* Technical Architecture & Upgrade Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="hud-card p-5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-accent/15 text-accent border border-accent/30">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">Consumo Ultra-Bajo del Equipo</h3>
            </div>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              El equipo del velero funciona en modo de ultra-ahorro de energía (deep-sleep), consumiendo prácticamente nada entre transmisiones (<strong>~0.15 mA</strong>). Al despertar, solo toma 4 segundos para leer los sensores de clima y sentina, enviar el reporte y volver a dormir.
            </p>
            <div className="space-y-2 text-xs font-mono text-foreground bg-background/90 p-3.5 rounded-lg border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumo en reposo:</span>
                <span className="text-hud-success font-bold">~0.15 mA (Imperceptible)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumo en reporte:</span>
                <span className="text-amber-400 font-bold">~120 mA (4 seg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumo total por día (3 reportes):</span>
                <span className="text-accent font-bold">&lt; 5 mAh / día</span>
              </div>
            </div>
          </div>

          <div className="hud-card p-5 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">Sensor de Voltaje de 12V</h3>
            </div>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Para medir la batería de servicio de 12V de forma segura sin sobrecargar el circuito, se conecta una línea de protección con divisor de tensión a la entrada analógica del equipo.
            </p>
            <div className="p-3.5 bg-background/90 rounded-lg border border-border text-[11px] text-muted-foreground font-mono leading-relaxed">
              <div className="text-foreground font-bold mb-1">Esquema de Conexión Náutica:</div>
              <code>Batería 12V (+) ──[100kΩ]──┬──[27kΩ]── Masa / Tierra (-)</code>
              <div className="mt-1">
                <code>                              └── Entrada Sensor (Pin ADC)</code>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

