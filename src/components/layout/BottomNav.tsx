'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, History, ShieldAlert, Battery, Sliders } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'General', icon: Compass },
    { href: '/history', label: 'Historial', icon: History },
    { href: '/bilge', label: 'Sentina', icon: ShieldAlert },
    { href: '/battery', label: 'Batería', icon: Battery },
    { href: '/settings', label: 'Ajustes', icon: Sliders },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-lg px-2 py-1.5 transition-colors duration-200">
      <div className="flex items-center justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg font-heading text-[10px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-accent font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg mb-0.5 transition-all ${
                  isActive ? 'bg-accent/20 text-accent border border-accent/40 shadow-[0_0_10px_rgba(59,130,246,0.25)]' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

