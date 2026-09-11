'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  Compass,
  Radio,
  Eye,
  LogOut,
  Sliders,
  History,
  Battery,
  ShieldAlert,
  Activity,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  watchdogStatus?: {
    isOnline: boolean;
    isDeadManTriggered: boolean;
  };
}

export function Navbar({ watchdogStatus }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isNight, toggleTheme } = useTheme();

  const navLinks = [
    { href: '/', label: 'General', icon: Compass },
    { href: '/history', label: 'Historial', icon: History },
    { href: '/bilge', label: 'Sentina', icon: ShieldAlert },
    { href: '/battery', label: 'Batería', icon: Battery },
    { href: '/settings', label: 'Ajustes', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Watchdog Pulse */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 border border-accent/30 text-accent group-hover:border-accent group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-200">
              <Compass className="h-5 w-5 motion-reduce:animate-none" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-bold text-sm tracking-wider text-primary group-hover:text-accent transition-colors">
                  TELEMETRÍA VELERO
                </span>
                {watchdogStatus && (
                  <span
                    className={`hud-badge ${
                      watchdogStatus.isDeadManTriggered
                        ? 'bg-destructive/20 text-destructive border-destructive/40'
                        : watchdogStatus.isOnline
                        ? 'bg-hud-success/15 text-hud-success border-hud-success/30'
                        : 'bg-hud-warning/15 text-hud-warning border-hud-warning/30'
                    }`}
                  >
                    <span
                      className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                        watchdogStatus.isDeadManTriggered
                          ? 'bg-destructive animate-ping motion-reduce:animate-none'
                          : watchdogStatus.isOnline
                          ? 'bg-hud-success'
                          : 'bg-hud-warning'
                      }`}
                    />
                    {watchdogStatus.isDeadManTriggered
                      ? 'Sin Señal'
                      : watchdogStatus.isOnline
                      ? 'En Vivo'
                      : 'Con Demora'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono tracking-tight">Monitor del Barco</p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-heading text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                    : 'text-muted-foreground hover:text-primary hover:bg-muted/80 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions (Night Vision Toggle & User Logout) */}
        <div className="flex items-center space-x-2.5">
          {/* Cockpit Red Night Vision Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isNight ? 'Cambiar a Modo Estándar de Alto Contraste' : 'Cambiar a Visión Nocturna de Cabina'}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-heading font-semibold transition-all duration-200 cursor-pointer ${
              isNight
                ? 'bg-red-950 text-red-300 border-red-700 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-900'
                : 'bg-muted text-foreground border-border hover:border-muted-foreground hover:bg-card shadow-sm'
            }`}
          >
            {isNight ? (
              <>
                <Eye className="h-4 w-4 text-red-400" />
                <span>Modo Nocturno</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-accent" />
                <span>Modo Diurno</span>
              </>
            )}
          </button>

          {/* User Sign Out */}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Cerrar Sesión"
              className="p-2 rounded-lg border border-border bg-muted hover:bg-card text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

