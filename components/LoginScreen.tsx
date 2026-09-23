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
  Users,
  Settings,
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, usuarios, logoEmpresa, nomeEmpresa } = useCommission();

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

  const handlePreencherUsuarioDemo = (usuarioId: string) => {
    const u = usuarios.find((item) => item.id === usuarioId);
    if (u) {
      setEmail(u.email);
      setSenha(u.senha || (u.perfil_nome === 'ADMINISTRADOR' ? 'admin' : '123'));
      setMensagemErro(null);
    }
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

      <div className="relative z-10 w-full max-w-md">
        {/* Main Glassmorphic Login Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          {/* Top Brand & Logo Header */}
          <div className="border-b border-slate-800/80 bg-slate-900/50 p-8 pb-6 text-center">
            {/* Custom Logo Display or Default Emblem */}
            <div className="mx-auto mb-4 flex items-center justify-center">
              {logoEmpresa ? (
                <div className="group relative flex max-h-20 max-w-[240px] items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-950/60 p-3 shadow-inner">
                  <img
                    src={logoEmpresa}
                    alt={nomeEmpresa || 'Logotipo da Empresa'}
                    className="max-h-14 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/30">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* System Title */}
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {nomeEmpresa || 'Comissões'}
              {!logoEmpresa && <span className="text-emerald-400">Pro</span>}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Portal Seguro de Comissionamento & Governança
            </p>

            {/* Logo tip badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-400">
              <Settings className="h-3 w-3 text-emerald-400" />
              <span>Logotipo personalizável em Configurações</span>
            </div>
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

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-2 font-bold tracking-wider text-slate-500">
                  Acesso Rápido para Demonstração
                </span>
              </div>
            </div>

            {/* Quick Demo Account Selector */}
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 text-center mb-1">
                Selecione um usuário para preenchimento automático de teste:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePreencherUsuarioDemo('u-admin-01')}
                  className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-left hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    <span>Administrador</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium truncate w-full">
                    Carlos Mendes
                  </span>
                  <span className="text-[9px] text-slate-500">Senha: admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreencherUsuarioDemo('u-vend-01')}
                  className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-left hover:border-blue-500/50 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400">
                    <Users className="h-3 w-3" />
                    <span>Vendedor</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium truncate w-full">
                    Lucas Silva
                  </span>
                  <span className="text-[9px] text-slate-500">Senha: 123</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreencherUsuarioDemo('u-vend-02')}
                  className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-left hover:border-purple-500/50 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                    <Users className="h-3 w-3" />
                    <span>Vendedora</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium truncate w-full">
                    Mariana Costa
                  </span>
                  <span className="text-[9px] text-slate-500">Senha: 123</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreencherUsuarioDemo('u-vend-03')}
                  className="flex flex-col items-start rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-left hover:border-amber-500/50 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                    <Users className="h-3 w-3" />
                    <span>Vendedor</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium truncate w-full">
                    Roberto Antunes
                  </span>
                  <span className="text-[9px] text-slate-500">Senha: 123</span>
                </button>
              </div>
            </div>
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
