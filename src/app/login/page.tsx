'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username,
        password,
        callbackUrl,
      });

      if (res?.error) {
        if (res.status === 429) {
          setError('Demasiados intentos fallidos. Por seguridad, espera 15 minutos antes de intentar de nuevo.');
        } else {
          setError('Usuario o contraseña incorrectos. Por favor, verifica tus credenciales.');
        }
      } else if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Ocurrió un error al verificar la cuenta. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/30 text-accent shadow-hud-glow">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Telemetría del Velero
        </h1>
        <p className="text-xs text-muted-foreground font-mono">
          Monitor Náutico Remoto y Guardián de Sentina
        </p>
      </div>

      {/* Login Card */}
      <div className="hud-card p-6 shadow-hud-lg space-y-5">
        {error && (
          <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/40 text-destructive text-xs font-mono flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div>
            <label className="block text-xs font-heading font-semibold text-foreground mb-1.5">
              Usuario / Patrón
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. capitan"
                className="input w-full pl-10 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-heading font-semibold text-foreground mb-1.5">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input w-full pl-10 pr-10 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 py-3 uppercase tracking-wider font-bold shadow-md cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Iniciando Sesión...' : 'Ingresar al Monitor'}
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-muted-foreground font-mono flex items-center justify-center space-x-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>Acceso náutico privado y seguro.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <Suspense fallback={<div className="text-muted-foreground font-mono text-xs">Cargando monitor...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

