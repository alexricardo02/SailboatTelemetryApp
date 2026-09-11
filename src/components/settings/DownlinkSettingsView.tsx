'use client';

import React, { useState, useEffect } from 'react';
import { DownlinkCommand, TelemetryMode } from '@/types';
import {
  Sliders,
  Radio,
  CheckCircle2,
  AlertCircle,
  Zap,
  Anchor,
  Snowflake,
  Send,
  Loader2,
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export function DownlinkSettingsView() {
  const [command, setCommand] = useState<DownlinkCommand | null>(null);
  const [selectedMode, setSelectedMode] = useState<TelemetryMode>('normal');
  const [customInterval, setCustomInterval] = useState<number>(480);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCommand = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/commands');
      if (res.ok) {
        const data = await res.json();
        setCommand(data);
        setSelectedMode(data.mode || 'normal');
        setCustomInterval(data.reportIntervalMinutes || 480);
      }
    } catch (err) {
      console.error('Error al consultar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommand();
  }, []);

  const handleModeSelect = (mode: TelemetryMode) => {
    setSelectedMode(mode);
    if (mode === 'normal') setCustomInterval(480); // 8h (3x/día)
    else if (mode === 'navigation') setCustomInterval(60); // 1h (24x/día)
    else if (mode === 'winter_storage') setCustomInterval(1440); // 24h (1x/día)
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage(null);

      const interval = selectedMode === 'custom' ? customInterval : (
        selectedMode === 'normal' ? 480 : selectedMode === 'navigation' ? 60 : 1440
      );

      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          reportIntervalMinutes: interval,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: '¡Configuración guardada! El equipo del velero la aplicará automáticamente en cuanto despierte para su próximo reporte.',
        });
        fetchCommand();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'No se pudo guardar la configuración.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Error de conexión con el servidor al guardar la configuración.',
      });
    } finally {
      setSaving(false);
    }
  };

  const modes = [
    {
      id: 'normal' as const,
      name: 'Modo Puerto / Marina',
      interval: 'Cada 8 Horas (3 al día)',
      minutes: 480,
      description: 'Equilibrio óptimo entre ahorro de batería y supervisión periódica de la cabina y la sentina amarrado en puerto.',
      icon: Anchor,
      badgeColor: 'bg-hud-cyan/10 text-hud-cyan border-hud-cyan/30',
    },
    {
      id: 'navigation' as const,
      name: 'Modo Navegación / Alerta',
      interval: 'Cada 1 Hora (24 al día)',
      minutes: 60,
      description: 'Alta frecuencia de datos durante travesías, navegación activa o cuando se vigilan tormentas y cambios bruscos.',
      icon: Zap,
      badgeColor: 'bg-hud-amber/10 text-hud-amber border-hud-amber/30',
    },
    {
      id: 'winter_storage' as const,
      name: 'Modo Invernada / Guardería',
      interval: 'Cada 24 Horas (1 al día)',
      minutes: 1440,
      description: 'Ahorro máximo de energía de batería mientras el barco está en guardería, en seco o fuera de temporada.',
      icon: Snowflake,
      badgeColor: 'bg-hud-emerald/10 text-hud-emerald border-hud-emerald/30',
    },
    {
      id: 'custom' as const,
      name: 'Intervalo Personalizado',
      interval: 'Minutos a Elección',
      minutes: customInterval,
      description: 'Definí un intervalo específico en minutos para pruebas o necesidades particulares de monitoreo.',
      icon: Sliders,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
  ];

  const getModeLabel = (mode?: string) => {
    switch (mode) {
      case 'normal': return 'Puerto / Marina';
      case 'navigation': return 'Navegación / Alerta';
      case 'winter_storage': return 'Invernada / Guardería';
      case 'custom': return 'Personalizado';
      default: return mode || 'Puerto / Marina';
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Wake Cycle Notice Banner */}
      <div className="hud-card p-4 sm:p-5 border-hud-cyan/30 bg-hud-cyan/5">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-hud-cyan/20 text-hud-cyan border border-hud-cyan/30 flex-shrink-0 mt-0.5">
            <Radio className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-hud-cyan font-display uppercase tracking-wider">
              ¿Cómo se aplican los cambios en el barco?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Para no agotar la batería, el equipo del velero permanece dormido el 99.9% del tiempo en modo ultrabajo consumo. Cada vez que despierta para transmitir mediciones, consulta al servidor si hay nuevas órdenes pendientes.
            </p>
            <p className="text-xs text-hud-cyan font-mono font-semibold pt-1">
              Cualquier cambio guardado quedará en espera y se activará en el <span className="underline">próximo despertar programado</span> del equipo.
            </p>
          </div>
        </div>
      </div>

      {/* Current Device State */}
      <div className="hud-card p-5 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">
          Estado Actual del Equipo en el Barco
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-background/80 rounded-lg p-3 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400">Modo Activo</span>
            <p className="text-sm sm:text-base font-bold text-slate-100 font-display uppercase tracking-wider mt-0.5">
              {loading ? '...' : getModeLabel(command?.mode)}
            </p>
          </div>

          <div className="bg-background/80 rounded-lg p-3 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400">Frecuencia de Reporte</span>
            <p className="text-sm sm:text-base font-bold text-hud-cyan font-mono mt-0.5">
              {loading ? '...' : `${command?.reportIntervalMinutes || 480} min`}
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({command ? (command.reportIntervalMinutes / 60).toFixed(1) : 8} h)
              </span>
            </p>
          </div>

          <div className="bg-background/80 rounded-lg p-3 border border-border">
            <span className="text-[10px] uppercase font-mono text-slate-400">Última Sincronización</span>
            <p className="text-xs font-medium text-slate-300 font-mono mt-1">
              {loading ? '...' : command?.lastFetchedAt ? formatTimeAgo(command.lastFetchedAt) : 'Pendiente del próximo despertar'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selection Form */}
      <form onSubmit={handleSave} className="hud-card p-5 space-y-5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 font-display uppercase tracking-wide">
            Elegir Modo de Funcionamiento
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Seleccioná el perfil de frecuencia según el estado actual del barco
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {modes.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => handleModeSelect(m.id)}
                className={`cursor-pointer rounded-xl p-4 border transition-all ${
                  isSelected
                    ? 'border-hud-cyan bg-hud-cyan/10 shadow-hud ring-1 ring-hud-cyan/50'
                    : 'border-border bg-card/40 hover:border-slate-700 hover:bg-card/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${m.badgeColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-display uppercase tracking-wider">{m.name}</h4>
                      <span className="text-[11px] font-mono font-semibold text-hud-cyan">{m.interval}</span>
                    </div>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? 'border-hud-cyan bg-hud-cyan' : 'border-slate-700 bg-background'
                    }`}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-background" />}
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-slate-400 font-mono leading-relaxed">{m.description}</p>
              </div>
            );
          })}
        </div>

        {/* Custom Interval Input */}
        {selectedMode === 'custom' && (
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-2">
            <label className="text-xs font-semibold text-slate-300 font-mono">
              Intervalo Personalizado (en minutos):
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min="1"
                max="10080"
                value={customInterval}
                onChange={(e) => setCustomInterval(parseInt(e.target.value, 10) || 60)}
                className="w-32 px-3 py-2 rounded-lg bg-card border border-border text-sm text-slate-100 focus:outline-none focus:border-hud-cyan font-mono"
              />
              <span className="text-xs text-slate-400 font-mono">
                = {(customInterval / 60).toFixed(1)} horas / {(1440 / Math.max(1, customInterval)).toFixed(1)} reportes al día
              </span>
            </div>
          </div>
        )}

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 font-mono ${
              statusMessage.type === 'success'
                ? 'bg-hud-emerald/10 border-hud-emerald/30 text-hud-emerald'
                : 'bg-hud-rose/10 border-hud-rose/30 text-hud-rose'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-hud-emerald" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-hud-rose" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Guardando Orden...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Guardar y Enviar al Barco</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

