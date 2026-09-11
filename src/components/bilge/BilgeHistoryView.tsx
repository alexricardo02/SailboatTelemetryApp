'use client';

import React, { useState, useEffect } from 'react';
import { BilgeEvent } from '@/types';
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  BarChart2,
  Edit3,
  Check,
  X,
  Clock,
  AlertOctagon,
  FileText,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface BilgeHistoryViewProps {
  initialEvents?: BilgeEvent[];
}

export function BilgeHistoryView({ initialEvents }: BilgeHistoryViewProps) {
  const [events, setEvents] = useState<BilgeEvent[]>(initialEvents || []);
  const [frequency, setFrequency] = useState<{ date: string; count: number }[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!initialEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setFrequency(data.frequency || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Failed to load bilge events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSaveNotes = async (eventId: string) => {
    try {
      setSavingNote(true);
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNoteText }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, notes: editNoteText } : e))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const dateStr = new Date(e.timestamp).toLocaleString('es-ES').toLowerCase();
    const notesStr = (e.notes || '').toLowerCase();
    return dateStr.includes(term) || notesStr.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="hud-card p-4 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 flex-shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider block">Total de Alarmas</span>
              <p className="hud-stat-value text-2xl font-black text-foreground font-mono mt-0.5">{totalCount}</p>
            </div>
          </div>
        </div>

        <div className="hud-card p-4 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-accent/15 text-accent border border-accent/30 flex-shrink-0">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider block">Últimos 7 Días</span>
              <p className="hud-stat-value text-2xl font-black text-foreground font-mono mt-0.5">
                {frequency.slice(-7).reduce((a, b) => a + b.count, 0)} activaciones
              </p>
            </div>
          </div>
        </div>

        <div className="hud-card p-4 sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-hud-success/15 text-hud-success border border-hud-success/30 flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider block">Estado del Monitoreo</span>
              <p className="font-heading text-sm font-bold text-hud-success mt-1">Guardián Activo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequency Bar Chart */}
      {frequency.length > 0 && (
        <div className="hud-card p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">
              Frecuencia de Activación por Día
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Identifica correlación con lluvias intensas en puerto, goteo de prensaestopa o navegación con escora
            </p>
          </div>

          <div className="h-48 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.8} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} fontFamily="var(--font-roboto-mono)" tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} fontFamily="var(--font-roboto-mono)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E23',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    fontFamily: 'var(--font-roboto-mono)',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="count" name="Activaciones" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activations Log Table */}
      <div className="hud-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground tracking-wide">Bitácora de Sentina</h3>
            <p className="text-[11px] text-muted-foreground font-mono">Registro cronológico inmutable de eventos de agua</p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por fecha o nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-mono">Cargando bitácora de sentina...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground font-mono">
            {events.length === 0
              ? 'No hay activaciones registradas. La sentina está completamente seca.'
              : 'No se encontraron registros con ese criterio de búsqueda.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEvents.map((evt) => {
              const date = new Date(evt.timestamp);
              const isEditing = editingId === evt.id;

              return (
                <div key={evt.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-destructive/20 text-destructive border border-destructive/30">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-heading text-xs font-bold text-destructive">
                          Agua en Sentina Detectada
                        </span>
                        <div className="flex items-center space-x-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{date.toLocaleDateString('es-ES')} a las {date.toLocaleTimeString('es-ES')}</span>
                        </div>
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingId(evt.id || null);
                          setEditNoteText(evt.notes || '');
                        }}
                        className="inline-flex items-center self-start sm:self-auto px-2.5 py-1 rounded-lg bg-background hover:bg-muted border border-border text-[11px] text-foreground font-mono transition cursor-pointer"
                      >
                        <Edit3 className="mr-1.5 h-3 w-3 text-accent" />
                        {evt.notes ? 'Editar Nota' : 'Agregar Nota'}
                      </button>
                    )}
                  </div>

                  {/* Note display / editor */}
                  {isEditing ? (
                    <div className="mt-2 space-y-2 bg-background/90 p-3 rounded-lg border border-border">
                      <textarea
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Escribe una anotación (ej. lluvia fuerte en puerto, prueba de bomba, ajuste de prensaestopa)..."
                        className="input w-full p-2 text-xs"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground hover:text-foreground transition cursor-pointer font-mono"
                        >
                          <X className="mr-1 h-3 w-3 inline" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => evt.id && handleSaveNotes(evt.id)}
                          disabled={savingNote}
                          className="btn-primary px-3 py-1 text-[11px] font-mono"
                        >
                          <Check className="mr-1 h-3 w-3 inline" />
                          {savingNote ? 'Guardando...' : 'Guardar Nota'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    evt.notes && (
                      <div className="mt-1 flex items-start space-x-2 bg-background/60 p-2.5 rounded-lg border border-border text-xs font-mono text-foreground">
                        <FileText className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-[11px]">{evt.notes}</span>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

