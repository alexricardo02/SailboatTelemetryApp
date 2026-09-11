import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BilgeHistoryView } from '@/components/bilge/BilgeHistoryView';
import { ShieldAlert } from 'lucide-react';

export default function BilgePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center space-x-2.5">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <span>Registro y Frecuencia de Sentina</span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Historial de activación del flotante de agua, correlación con lluvias y notas de mantenimiento
          </p>
        </div>

        <BilgeHistoryView />
      </main>
    </div>
  );
}

