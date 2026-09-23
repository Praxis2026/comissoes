'use client';

import React from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  RotateCcw,
  Sliders,
  SlidersHorizontal,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

interface NavbarProps {
  abaAtiva: string;
  setAbaAtiva: (aba: string) => void;
  onAbrirNovaVenda: () => void;
}

export function Navbar({ abaAtiva, setAbaAtiva, onAbrirNovaVenda }: NavbarProps) {
  const { usuarios, usuarioAtual, setUsuarioAtual, lancamentos, resetarParaDadosIniciais } =
    useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  // Stats calculation
  const totalPendentesAprovacao = lancamentos.filter((l) => l.status === 'PENDENTE_APROVACAO').length;
  const meusAprovados = lancamentos.filter(
    (l) => l.status === 'APROVADO' && (isAdmin || l.vendedor_id === usuarioAtual.id)
  ).length;
  const totalConferidosAguardandoRepasse = lancamentos.filter(
    (l) => l.status === 'CONFERIDO' && (isAdmin || l.vendedor_id === usuarioAtual.id)
  ).length;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs">
      {/* Top Header Bar */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Sistema de Comissionamento Comercial
              </h1>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                PostgreSQL & RBAC
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Escalonamento por Entrada Válida • Versionamento Contratual • Fluxo de Liquidação
            </p>
          </div>
        </div>

        {/* User / Role Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs">
            <span className="flex items-center gap-1 font-medium text-slate-500 pl-1">
              <Users className="h-3.5 w-3.5" />
              Alternar Usuário:
            </span>
            <select
              value={usuarioAtual.id}
              onChange={(e) => {
                const u = usuarios.find((item) => item.id === e.target.value);
                if (u) {
                  setUsuarioAtual(u);
                  // Ajustar aba caso mude o perfil
                  if (u.perfil_nome === 'ADMINISTRADOR' && ['minhas_vendas', 'conferencia_vendedor'].includes(abaAtiva)) {
                    setAbaAtiva('aprovacoes');
                  } else if (u.perfil_nome === 'VENDEDOR' && ['aprovacoes', 'regras', 'repasses_admin'].includes(abaAtiva)) {
                    setAbaAtiva('minhas_vendas');
                  }
                }
              }}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-hidden"
            >
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.perfil_nome === 'ADMINISTRADOR' ? 'Admin' : 'Vendedor'})
                </option>
              ))}
            </select>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isAdmin
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <UserCheck className="h-3 w-3" />
            {isAdmin ? 'Perfil Administrador' : 'Perfil Vendedor'}
          </span>

          <button
            onClick={resetarParaDadosIniciais}
            title="Restaurar dados iniciais de demonstração"
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restaurar Dados</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div className="border-t border-slate-100 bg-slate-50/70 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 py-2">
          {/* Tabs */}
          <nav className="flex flex-wrap items-center gap-1">
            {isAdmin ? (
              // Navigation for Administrator
              <>
                <button
                  onClick={() => setAbaAtiva('aprovacoes')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'aprovacoes'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Aprovações
                  {totalPendentesAprovacao > 0 && (
                    <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-bold text-slate-950">
                      {totalPendentesAprovacao}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAbaAtiva('repasses_admin')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'repasses_admin'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Lotes de Repasse
                  {totalConferidosAguardandoRepasse > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                      {totalConferidosAguardandoRepasse}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAbaAtiva('conferencia_vendedor')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'conferencia_vendedor'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Relatório de Conferência (5.1)
                </button>

                <button
                  onClick={() => setAbaAtiva('configuracoes')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'configuracoes'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Configurações (Parâmetros)
                </button>

                <button
                  onClick={() => setAbaAtiva('importar_erp')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'importar_erp'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Importação ERP/PDV
                </button>
              </>
            ) : (
              // Navigation for Salesperson
              <>
                <button
                  onClick={() => setAbaAtiva('minhas_vendas')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'minhas_vendas'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Minhas Vendas & Rascunhos
                </button>

                <button
                  onClick={() => setAbaAtiva('conferencia_vendedor')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'conferencia_vendedor'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conferência de Comissões (5.1)
                  {meusAprovados > 0 && (
                    <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {meusAprovados} aguardando
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setAbaAtiva('configuracoes')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    abaAtiva === 'configuracoes'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Parâmetros de Comissão
                </button>
              </>
            )}

            {/* Common Tab: SQL & Stored Procedure Viewer */}
            <button
              onClick={() => setAbaAtiva('stored_procedure')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                abaAtiva === 'stored_procedure'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
              Stored Procedure PL/pgSQL
              <span className="rounded-xs bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-700">
                SQL
              </span>
            </button>
          </nav>

          {/* Action: Lançar Venda */}
          <button
            onClick={onAbrirNovaVenda}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Lançar Nova Venda</span>
          </button>
        </div>
      </div>
    </header>
  );
}
