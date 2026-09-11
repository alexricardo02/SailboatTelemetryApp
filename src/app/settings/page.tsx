import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DownlinkSettingsView } from '@/components/settings/DownlinkSettingsView';
import { Sliders } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 md:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2 font-display tracking-wide uppercase">
            <Sliders className="h-5 w-5 text-hud-cyan" />
            <span>Configuración y Frecuencia de Envíos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Ajustá la periodicidad de los reportes y el modo de ahorro de energía del barco
          </p>
        </div>

        <DownlinkSettingsView />
      </main>
    </div>
  );
}
