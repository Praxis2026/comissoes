'use client';
/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  FileCheck,
  FileText,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  UserCheck,
  Users,
  Wallet,
  LogOut,
  RotateCcw,
} from 'lucide-react';

interface HeaderProps {
  abaAtiva: string;
  subAbaVendas?: string;
  onOpenMobileSidebar: () => void;
  onNovaVenda: () => void;
  onIrParaDashboard?: () => void;
}

export function Header({
  abaAtiva,
  subAbaVendas = 'TODOS',
  onOpenMobileSidebar,
  onNovaVenda,
  onIrParaDashboard,
}: HeaderProps) {
  const {
    usuarioAtual,
    usuarios,
    setUsuarioAtual,
    adminOriginal,
    isImpersonating,
    voltarParaAdministrador,
    lancamentos,
    temPermissao,
    logoEmpresa,
    nomeEmpresa,
    logout,
  } = useCommission();
  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const podeAlternarPerfil = isAdmin || adminOriginal !== null;
  const podeInserirVenda = temPermissao('minhas_vendas', 'inserir');

  const nomesSubmenus: Record<string, string> = {
    TODOS: 'Todas as Vendas',
    RASCUNHO: 'Rascunhos',
    PENDENTE_APROVACAO: 'Pendentes de Aprovação',
    APROVADO: 'Aprovadas',
    REJEITADO: 'Rejeitadas',
    CONFERIDO: 'Conferidas',
    LIQUIDADO: 'Liquidadas / Pagas',
  };

  // Title and subtitle mapping
  const getRouteInfo = () => {
    switch (abaAtiva) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: isAdmin
            ? 'Informações agrupadas de todos os vendedores e métricas consolidadas'
            : 'Desempenho de vendas, entradas captadas e comissões do vendedor',
          icon: BarChart3,
        };
      case 'minhas_vendas':
        return {
          title: 'Minhas Vendas & Rascunhos',
          subTitleExtra: subAbaVendas !== 'TODOS' ? nomesSubmenus[subAbaVendas] : null,
          subtitle:
            subAbaVendas !== 'TODOS'
              ? `Submenu: ${nomesSubmenus[subAbaVendas]} • Tela de rolagem própria independente`
              : 'Lançamento de contratos, gestão de rascunhos e envio para aprovação',
          icon: FileText,
        };
      case 'conferencia_vendedor':
        return {
          title: 'Conferência de Comissões',
          subtitle: 'Aceite formal pelo vendedor antes da inclusão no lote de repasse (Requisito 5.1)',
          icon: FileCheck,
        };
      case 'aprovacoes':
        return {
          title: 'Aprovações & Auditoria',
          subtitle: 'Revisão e validação de vendas pela gestão comercial',
          icon: UserCheck,
        };
      case 'repasses_admin':
        return {
          title: 'Repasses Financeiros & Lotes',
          subtitle: 'Fechamento de lotes atômicos com comprovante bancário',
          icon: Wallet,
        };
      case 'configuracoes':
      case 'regras':
        return {
          title: 'Configurações',
          subtitle: 'Parâmetros de comissão, modelos escalonados, meios de entrada e governança',
          icon: Settings,
        };
      case 'importar_erp':
        return {
          title: 'Importação ERP (Lote)',
          subtitle: 'Carga em massa de contratos e integração com sistemas externos',
          icon: UploadCloud,
        };
      default:
        return {
          title: 'Comissões Pro',
          subtitle: 'Sistema de Comissionamento Comercial',
          icon: Building2,
        };
    }
  };

  const route = getRouteInfo();
  const IconComponent = route.icon;

  const pendentesConferencia = lancamentos.filter(
    (l) => l.status === 'APROVADO' && (isAdmin || l.vendedor_id === usuarioAtual.id)
  ).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {logoEmpresa ? (
            <div className="hidden sm:flex items-center max-h-6 max-w-[120px]">
              <img
                src={logoEmpresa}
                alt={nomeEmpresa || 'Logo'}
                className="max-h-6 max-w-full object-contain"
              />
            </div>
          ) : (
            <span className="font-semibold text-slate-400 hidden sm:inline">
              {nomeEmpresa || 'Praxis Comissionamentos'}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden sm:inline" />
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <IconComponent className="h-4 w-4 text-emerald-600" />
            <span>{route.title}</span>
          </div>
          {route.subTitleExtra && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 hidden md:inline" />
              <span className="font-semibold text-emerald-700 hidden md:inline">
                {route.subTitleExtra}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick actions, Status pills & User Switcher */}
      <div className="flex items-center gap-2.5">
        {/* System security pill */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-[11px] font-semibold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>PostgreSQL Relacional</span>
        </div>

        {/* User Badge / Switcher (Switcher available for Administrator or when acting as another user) */}
        {podeAlternarPerfil ? (
          <div className="flex items-center gap-1.5">
            {isImpersonating && (
              <button
                type="button"
                onClick={() => {
                  voltarParaAdministrador();
                  onIrParaDashboard?.();
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] px-2.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                title="Retornar para o perfil do Administrador original"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Voltar para Admin</span>
              </button>
            )}

            <div
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition-colors ${
                isImpersonating
                  ? 'border-amber-300 bg-amber-50/80 text-amber-900 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                {isImpersonating ? 'Atuando como:' : 'Perfil:'}
              </span>
              <select
                value={usuarioAtual.id}
                onChange={(e) => {
                  const u = usuarios.find((item) => item.id === e.target.value);
                  if (u) {
                    setUsuarioAtual(u);
                    onIrParaDashboard?.();
                  }
                }}
                className={`rounded-md border-0 bg-transparent py-0.5 pl-1 pr-6 text-xs font-bold focus:outline-hidden cursor-pointer ${
                  isImpersonating ? 'text-amber-950' : 'text-slate-800'
                }`}
              >
                {usuarios.map((u) => {
                  const prefixo =
                    u.perfil_nome === 'ADMINISTRADOR'
                      ? '👔 Admin: '
                      : u.perfil_nome === 'GERENTE'
                      ? '👑 Gerente: '
                      : u.perfil_nome === 'AUDITOR'
                      ? '🔍 Auditor: '
                      : '💼 Vendedor: ';
                  return (
                    <option key={u.id} value={u.id}>
                      {prefixo}
                      {u.nome}
                      {!u.ativo ? ' [Inativo]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-[11px]">
              {usuarioAtual.nome.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 leading-tight">
                {usuarioAtual.nome}
              </span>
              <span className="text-[10px] font-medium text-slate-500">
                {usuarioAtual.cargo || usuarioAtual.perfil_nome}
              </span>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        {podeInserirVenda && (
          <button
            onClick={onNovaVenda}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Venda</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Encerrar sessão e retornar à tela de login"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
