'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'hud' | 'night';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  autoNightMode: boolean;
  setAutoNightMode: (enabled: boolean) => void;
  isNight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('hud');
  const [autoNightMode, setAutoNightModeState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const applyThemeClass = (newTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (newTheme === 'night') {
      root.classList.add('night');
      document.body.classList.add('night');
    } else {
      root.classList.remove('night');
      document.body.classList.remove('night');
    }
  };

  useEffect(() => {
    // Load persisted preferences
    const savedTheme = localStorage.getItem('sailboat_theme') as ThemeMode | null;
    const savedAuto = localStorage.getItem('sailboat_auto_night') === 'true';

    setAutoNightModeState(savedAuto);

    if (savedAuto) {
      const currentHour = new Date().getHours();
      // Auto night mode between 20:00 (8 PM) and 06:00 (6 AM)
      if (currentHour >= 20 || currentHour < 6) {
        setThemeState('night');
        applyThemeClass('night');
        setMounted(true);
        return;
      }
    }

    if (savedTheme === 'night' || savedTheme === 'hud') {
      setThemeState(savedTheme);
      applyThemeClass(savedTheme);
    } else {
      // Default to Space Tech / Aerospace HUD mode (#0B0B10)
      setThemeState('hud');
      applyThemeClass('hud');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('sailboat_theme', newTheme);
    applyThemeClass(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'night' ? 'hud' : 'night';
    setTheme(nextTheme);
  };

  const setAutoNightMode = (enabled: boolean) => {
    setAutoNightModeState(enabled);
    localStorage.setItem('sailboat_auto_night', String(enabled));
  };

  const isNight = theme === 'night';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        autoNightMode,
        setAutoNightMode,
        isNight,
      }}
    >
      <div className={mounted && isNight ? 'night' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

