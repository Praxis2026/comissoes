'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Database,
  DollarSign,
  Edit3,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

interface SidebarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  subAbaVendas?: string;
  setSubAbaVendas?: (status: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onNovaVenda: () => void;
}

export function Sidebar({
  abaAtiva,
  setAbaAtiva,
  subAbaVendas = 'TODOS',
  setSubAbaVendas,
  isOpenMobile,
  onCloseMobile,
  onNovaVenda,
}: SidebarProps) {
  const {
    usuarioAtual,
    setUsuarioAtual,
    usuarios,
    vendas,
    lancamentos,
    resetarParaDadosIniciais,
    temPermissao,
    logoEmpresa,
    nomeEmpresa,
    logout,
  } = useCommission();

  const [submenusVendasExpandidos, setSubmenusVendasExpandidos] = useState(true);

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  // Permission checks per module
  const podeInserirVenda = temPermissao('minhas_vendas', 'inserir');
  const temAcessoDashboard = temPermissao('dashboard');
  const temAcessoMinhasVendas = temPermissao('minhas_vendas');
  const temAcessoConferencia = temPermissao('conferencia_vendedor');
  const temAcessoAprovacoes = temPermissao('aprovacoes');
  const temAcessoRepasses = temPermissao('repasses_admin');
  const temAcessoImportar = temPermissao('importar_erp');
  const temAcessoStoredProc = temPermissao('stored_procedure');
  const temAcessoConfiguracoes = temPermissao('configuracoes');

  // Badges calculation
  const pendentesAprovacaoQtd = lancamentos.filter(
    (l) => l.status === 'PENDENTE_APROVACAO'
  ).length;

  const minhasVendas = vendas.filter(
    (v) => isAdmin || v.vendedor_id === usuarioAtual.id
  );
  const minhasVendasQtd = minhasVendas.length;

  const rascunhosQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return !lanc || lanc.status === 'RASCUNHO';
  }).length;

  const pendentesVendedorQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return lanc?.status === 'PENDENTE_APROVACAO';
  }).length;

  const aprovadasVendedorQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return lanc?.status === 'APROVADO';
  }).length;

  const rejeitadasVendedorQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return lanc?.status === 'REJEITADO';
  }).length;

  const conferidasVendedorQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return lanc?.status === 'CONFERIDO';
  }).length;

  const liquidadasVendedorQtd = minhasVendas.filter((v) => {
    const lanc = lancamentos.find((l) => l.venda_id === v.id);
    return lanc?.status === 'LIQUIDADO';
  }).length;

  const pendentesConferenciaVendedorQtd = lancamentos.filter(
    (l) =>
      l.status === 'APROVADO' &&
      (isAdmin || l.vendedor_id === usuarioAtual.id)
  ).length;

  const handleNavegar = (chave: string) => {
    setAbaAtiva(chave);
    onCloseMobile();
  };

  const handleNavegarSubmenuVendas = (statusId: string) => {
    setAbaAtiva('minhas_vendas');
    setSubAbaVendas?.(statusId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Lateral Menu Container - Fixo e independente de rolagem */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 shrink-0 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800 shadow-xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex items-center gap-3 overflow-hidden">
            {logoEmpresa ? (
              <div className="flex h-10 max-w-[130px] shrink-0 items-center justify-center rounded-lg bg-slate-950 px-2 py-1 border border-slate-800">
                <img
                  src={logoEmpresa}
                  alt={nomeEmpresa || 'Logo'}
                  className="max-h-7 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="truncate">
              <span className="text-sm font-black tracking-tight text-white block truncate">
                {nomeEmpresa || (
                  <>
                    Comissões<span className="text-emerald-400">Pro</span>
                  </>
                )}
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wide uppercase">
                Motor Relacional 1.1
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Action: New Sale */}
        {podeInserirVenda && (
          <div className="p-4 pb-2">
            <button
              onClick={() => {
                onNovaVenda();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-[0.98] transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Lançar Nova Venda
            </button>
          </div>
        )}

        {/* Navigation Groups (Scrollable próprio do menu) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 text-xs custom-scrollbar">
          {/* Group 1: Visão Geral */}
          {temAcessoDashboard && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Principal
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavegar('dashboard')}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                    abaAtiva === 'dashboard'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </div>
                  {abaAtiva === 'dashboard' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              </nav>
            </div>
          )}

          {/* Group 2: Comercial */}
          {(temAcessoMinhasVendas || temAcessoConferencia) && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Comercial & Vendas
              </div>
              <nav className="space-y-1">
                {/* Minhas Vendas & Rascunhos com Submenus Expansíveis */}
                {temAcessoMinhasVendas && (
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        handleNavegar('minhas_vendas');
                        setSubmenusVendasExpandidos(!submenusVendasExpandidos);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                        abaAtiva === 'minhas_vendas'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4" />
                        <span>Minhas Vendas & Rascunhos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          suppressHydrationWarning
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300"
                        >
                          {minhasVendasQtd}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            submenusVendasExpandidos ? 'rotate-180 text-white' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </button>

                    {/* Submenus com tela de rolagem própria */}
                    {submenusVendasExpandidos && (
                      <div className="ml-3 pl-2.5 pt-1 pb-1 space-y-0.5 border-l-2 border-emerald-500/40">
                        {[
                          {
                            id: 'TODOS',
                            label: 'Todas as Vendas',
                            icon: FileText,
                            count: minhasVendasQtd,
                            badgeColor: 'bg-slate-800 text-slate-300',
                          },
                          {
                            id: 'RASCUNHO',
                            label: 'Rascunhos',
                            icon: Edit3,
                            count: rascunhosQtd,
                            badgeColor: 'bg-slate-700 text-slate-200',
                          },
                          {
                            id: 'PENDENTE_APROVACAO',
                            label: 'Pendentes Aprovação',
                            icon: Clock,
                            count: pendentesVendedorQtd,
                            badgeColor: 'bg-amber-500/20 text-amber-300',
                          },
                          {
                            id: 'APROVADO',
                            label: 'Aprovadas (Aguardando)',
                            icon: CheckCircle2,
                            count: aprovadasVendedorQtd,
                            badgeColor: 'bg-blue-500/20 text-blue-300',
                          },
                          {
                            id: 'REJEITADO',
                            label: 'Rejeitadas',
                            icon: XCircle,
                            count: rejeitadasVendedorQtd,
                            badgeColor: 'bg-rose-500/20 text-rose-300',
                          },
                          {
                            id: 'CONFERIDO',
                            label: 'Conferidas',
                            icon: FileCheck,
                            count: conferidasVendedorQtd,
                            badgeColor: 'bg-emerald-500/20 text-emerald-300',
                          },
                          {
                            id: 'LIQUIDADO',
                            label: 'Liquidadas / Pagas',
                            icon: DollarSign,
                            count: liquidadasVendedorQtd,
                            badgeColor: 'bg-purple-500/20 text-purple-300',
                          },
                        ].map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubAtiva =
                            abaAtiva === 'minhas_vendas' &&
                            subAbaVendas === sub.id;

                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleNavegarSubmenuVendas(sub.id)}
                              className={`w-full flex items-center justify-between rounded-lg py-1.5 px-2 text-[11px] font-medium transition-colors ${
                                isSubAtiva
                                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border-l-2 border-emerald-400 pl-1.5'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon
                                  className={`h-3 w-3 shrink-0 ${
                                    isSubAtiva ? 'text-emerald-400' : 'text-slate-500'
                                  }`}
                                />
                                <span className="truncate">{sub.label}</span>
                              </div>
                              {sub.count > 0 && (
                                <span
                                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${sub.badgeColor}`}
                                >
                                  {sub.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Conferência de Comissões */}
                {temAcessoConferencia && (
                  <button
                    onClick={() => handleNavegar('conferencia_vendedor')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                      abaAtiva === 'conferencia_vendedor'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="h-4 w-4" />
                      <span>Conferência de Comissões</span>
                    </div>
                    {pendentesConferenciaVendedorQtd > 0 && (
                      <span
                        suppressHydrationWarning
                        className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950"
                      >
                        {pendentesConferenciaVendedorQtd}
                      </span>
                    )}
                  </button>
                )}
              </nav>
            </div>
          )}

          {/* Group 3: Gestão & Finanças (Admin / Auditor Modules) */}
          {(temAcessoAprovacoes ||
            temAcessoRepasses ||
            temAcessoImportar ||
            temAcessoStoredProc) && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Gestão & Repasses</span>
                {isAdmin && (
                  <span className="text-[9px] font-bold text-purple-400">ADMIN</span>
                )}
              </div>
              <nav className="space-y-1">
                {/* Aprovações */}
                {temAcessoAprovacoes && (
                  <button
                    onClick={() => handleNavegar('aprovacoes')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                      abaAtiva === 'aprovacoes'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="h-4 w-4" />
                      <span>Aprovações & Auditoria</span>
                    </div>
                    {pendentesAprovacaoQtd > 0 && (
                      <span
                        suppressHydrationWarning
                        className="rounded-full bg-purple-400 px-2 py-0.5 text-[10px] font-bold text-slate-950"
                      >
                        {pendentesAprovacaoQtd}
                      </span>
                    )}
                  </button>
                )}

                {/* Repasses em Lote */}
                {temAcessoRepasses && (
                  <button
                    onClick={() => handleNavegar('repasses_admin')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                      abaAtiva === 'repasses_admin'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4" />
                      <span>Repasses Financeiros & Lotes</span>
                    </div>
                  </button>
                )}

                {/* Importação ERP */}
                {temAcessoImportar && (
                  <button
                    onClick={() => handleNavegar('importar_erp')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                      abaAtiva === 'importar_erp'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UploadCloud className="h-4 w-4" />
                      <span>Importação ERP (Lote)</span>
                    </div>
                  </button>
                )}

                {/* DDL & Stored Procedure */}
                {temAcessoStoredProc && (
                  <button
                    onClick={() => handleNavegar('stored_procedure')}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                      abaAtiva === 'stored_procedure'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Code2 className="h-4 w-4" />
                      <span>DDL & Stored Procedure</span>
                    </div>
                  </button>
                )}
              </nav>
            </div>
          )}

          {/* Group 4: Configurações */}
          {temAcessoConfiguracoes && (
            <div>
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Sistema
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavegar('configuracoes')}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                    abaAtiva === 'configuracoes' || abaAtiva === 'regras'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4" />
                    <span>Configurações</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Sub-item: Gestão de Usuários */}
                <button
                  onClick={() => handleNavegar('configuracoes')}
                  className={`w-full flex items-center justify-between rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-medium transition-colors ${
                    abaAtiva === 'configuracoes' || abaAtiva === 'regras'
                      ? 'text-emerald-300 font-bold bg-slate-800/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>Gestão de Usuários</span>
                  </div>
                  <span className="rounded bg-emerald-500/30 px-1 py-0.2 text-[8px] font-black text-emerald-300 uppercase">
                    Novo
                  </span>
                </button>

                {/* Sub-item: Parâmetros de Comissão */}
                <button
                  onClick={() => handleNavegar('configuracoes')}
                  className="w-full flex items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-medium transition-colors text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Modelos & Regras</span>
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher Footer */}
        <div className="border-t border-slate-800/80 p-3 bg-slate-950/40">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                    isAdmin
                      ? 'bg-purple-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {usuarioAtual.nome.charAt(0)}
                </div>
                <div className="truncate">
                  <div className="truncate font-bold text-xs text-white">
                    {usuarioAtual.nome}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        isAdmin ? 'bg-purple-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span>{usuarioAtual.perfil_nome}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Switch User Selector */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Simular Usuário Logado:
              </label>
              <select
                value={usuarioAtual.id}
                onChange={(e) => {
                  const u = usuarios.find((item) => item.id === e.target.value);
                  if (u) setUsuarioAtual(u);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 focus:border-emerald-500 focus:outline-hidden"
              >
                {usuarios.map((u) => {
                  const prefixo =
                    u.perfil_nome === 'ADMINISTRADOR'
                      ? '👔 [Admin] '
                      : u.perfil_nome === 'GERENTE'
                      ? '👑 [Gerente] '
                      : u.perfil_nome === 'AUDITOR'
                      ? '🔍 [Auditor] '
                      : '💼 [Vendedor] ';
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

            {/* Actions: Reset Database & Logout */}
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja restaurar os dados iniciais do sistema de comissões (vendas, regras e lotes originais)?'
                    )
                  ) {
                    resetarParaDadosIniciais();
                  }
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
                title="Restaura os dados originais"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Dados demo</span>
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors py-1 cursor-pointer"
                title="Encerrar sessão de acesso"
              >
                <LogOut className="h-3 w-3" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
