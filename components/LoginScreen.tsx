'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, logoEmpresa, nomeEmpresa } = useCommission();

  const nomeExibicao =
    nomeEmpresa === 'Capital Finance Comissões' ||
    nomeEmpresa === 'Comissões Pro' ||
    !nomeEmpresa
      ? 'Praxis Comissionamentos'
      : nomeEmpresa;

  const logoExibicao =
    logoEmpresa?.includes('CAPITAL%20FINANCE') || logoEmpresa?.includes('CAPITAL FINANCE')
      ? 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 60" fill="none"><rect width="220" height="60" rx="10" fill="%230f172a"/><circle cx="32" cy="30" r="18" fill="%2310b981"/><path d="M22 36l7-8 6 5 9-11" stroke="%23ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="60" y="28" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="15">PRAXIS</text><text x="60" y="44" fill="%2334d399" font-family="sans-serif" font-weight="700" font-size="9" letter-spacing="1">COMISSIONAMENTOS</text></svg>'
      : logoEmpresa;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    if (!email.trim()) {
      setMensagemErro('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setCarregando(true);

    setTimeout(() => {
      const resultado = login(email, senha);
      setCarregando(false);

      if (!resultado.sucesso) {
        setMensagemErro(resultado.mensagem);
      } else {
        if (onLoginSuccess) onLoginSuccess();
      }
    }, 450);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/5 blur-2xl" />

      {/* Subtle Grid Background Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Main Glassmorphic Login Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          {/* Top Brand & Logo Header */}
          <div className="border-b border-slate-800/80 bg-slate-900/50 p-8 pb-6 text-center">
            {/* Custom Logo Display or Default Emblem (2x Space com Fundo Branco) */}
            <div className="mx-auto mb-5 flex items-center justify-center">
              {logoExibicao ? (
                <div className="group relative flex min-h-[140px] max-h-40 w-full max-w-[480px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition-all">
                  <img
                    src={logoExibicao}
                    alt={nomeExibicao}
                    className="max-h-28 sm:max-h-32 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-slate-200 bg-white text-emerald-600 shadow-xl">
                  <Building2 className="h-16 w-16" />
                </div>
              )}
            </div>

            {/* System Title */}
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {nomeExibicao}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Portal Seguro de Comissionamento & Governança
            </p>
          </div>

          {/* Form Content */}
          <div className="p-8 pt-6">
            {/* Error Feedback */}
            {mensagemErro && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="leading-relaxed">{mensagemErro}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Usuário */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: carlos.mendes@empresa.com.br"
                    required
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Senha (Sem esqueci senha nem alterar senha) */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha de acesso"
                    required
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:bg-slate-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                    title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Manter Conectado Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lembrarAcesso}
                    onChange={(e) => setLembrarAcesso(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-400">Lembrar neste navegador</span>
                </label>
              </div>

              {/* Botão de Entrar */}
              <button
                type="submit"
                disabled={carregando}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
              >
                {carregando ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Autenticando...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Security Note */}
          <div className="border-t border-slate-800/80 bg-slate-950/50 px-8 py-3.5 text-center text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Ambiente protegido por controle de acesso e regras RBAC
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
