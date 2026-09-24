'use client';

import React, { useState } from 'react';
import { CommissionProvider, useCommission } from '@/lib/commission-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardView } from '@/components/DashboardView';
import { VendorSalesList } from '@/components/VendorSalesList';
import { VendorConferenceReport } from '@/components/VendorConferenceReport';
import { AdminApprovals } from '@/components/AdminApprovals';
import { AdminRepasseBatch } from '@/components/AdminRepasseBatch';
import { CommissionSettings } from '@/components/CommissionSettings';
import { SqlStoredProcedureViewer } from '@/components/SqlStoredProcedureViewer';
import { ImportSalesModal } from '@/components/ImportSalesModal';
import { SalesEntryModal } from '@/components/SalesEntryModal';
import { LoginScreen } from '@/components/LoginScreen';
import { Venda, ModuloSistemaId, MODULOS_SISTEMA } from '@/lib/types';
import { ShieldAlert, ShieldCheck, Sliders, Wallet, RotateCcw } from 'lucide-react';

function DashboardApp() {
  const {
    usuarioAtual,
    temPermissao,
    estaAutenticado,
    adminOriginal,
    isImpersonating,
    voltarParaAdministrador,
  } = useCommission();

  // Active view tab: Default is 'dashboard' (primeiro módulo)
  const [abaAtiva, setAbaAtiva] = useState<string>('dashboard');

  // Submenu ativo de Minhas Vendas
  const [subAbaVendas, setSubAbaVendas] = useState<string>('TODOS');

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sales Entry / Edit Modal
  const [isModalVendaAberta, setIsModalVendaAberta] = useState(false);
  const [vendaEmEdicao, setVendaEmEdicao] = useState<Venda | null>(null);

  // Sempre que logar em um usuário ou trocar de usuário autenticado, ir direto para o Dashboard
  const prevUsuarioIdRef = React.useRef(usuarioAtual.id);
  const prevAutenticadoRef = React.useRef(estaAutenticado);

  React.useEffect(() => {
    // Se o usuário acabou de autenticar (login efetuado) OU se o usuário ativo mudou
    if (!prevAutenticadoRef.current && estaAutenticado) {
      setAbaAtiva('dashboard');
      setSubAbaVendas('TODOS');
    } else if (prevUsuarioIdRef.current !== usuarioAtual.id) {
      setAbaAtiva('dashboard');
      setSubAbaVendas('TODOS');
    }
    prevUsuarioIdRef.current = usuarioAtual.id;
    prevAutenticadoRef.current = estaAutenticado;
  }, [estaAutenticado, usuarioAtual.id]);

  // Se o usuário não estiver autenticado, exibe a tela de login moderna
  if (!estaAutenticado) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          setAbaAtiva('dashboard');
          setSubAbaVendas('TODOS');
        }}
      />
    );
  }

  const handleAbrirNovaVenda = () => {
    setVendaEmEdicao(null);
    setIsModalVendaAberta(true);
  };

  const handleEditarVenda = (venda: Venda) => {
    setVendaEmEdicao(venda);
    setIsModalVendaAberta(true);
  };

  const handleIrParaConferencia = () => {
    setAbaAtiva('conferencia_vendedor');
  };

  // Mapeamento de aba para ID de módulo para validação de acesso
  const mapeamentoModulo: Record<string, ModuloSistemaId> = {
    dashboard: 'dashboard',
    minhas_vendas: 'minhas_vendas',
    conferencia_vendedor: 'conferencia_vendedor',
    aprovacoes: 'aprovacoes',
    repasses_admin: 'repasses_admin',
    configuracoes: 'configuracoes',
    regras: 'configuracoes',
    usuarios: 'configuracoes',
    identidade_visual: 'configuracoes',
    importar_erp: 'importar_erp',
    stored_procedure: 'stored_procedure',
  };

  const moduloAtualId = mapeamentoModulo[abaAtiva] || 'dashboard';
  const temAcessoAoModuloAtual = temPermissao(moduloAtualId, 'visualizar');
  const moduloInfoAtual = MODULOS_SISTEMA.find((m) => m.id === moduloAtualId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100/70 text-slate-900">
      {/* Lateral Menu / Sidebar - Fixo na lateral esquerda */}
      <Sidebar
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        subAbaVendas={subAbaVendas}
        setSubAbaVendas={setSubAbaVendas}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNovaVenda={handleAbrirNovaVenda}
      />

      {/* Main Content Layout */}
      <div className="flex h-screen flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          abaAtiva={abaAtiva}
          subAbaVendas={subAbaVendas}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNovaVenda={handleAbrirNovaVenda}
          onIrParaDashboard={() => {
            setAbaAtiva('dashboard');
            setSubAbaVendas('TODOS');
          }}
        />

        {/* Impersonation Alert Banner */}
        {isImpersonating && adminOriginal && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-4 py-2.5 text-xs shadow-xs border-b border-amber-600 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
              <span>
                <strong>Modo Atuação de Perfil:</strong> Você está navegando e agindo como{' '}
                <span className="font-extrabold underline decoration-white/60 underline-offset-2">
                  {usuarioAtual.nome}
                </span>{' '}
                ({usuarioAtual.perfil_nome}). Todos os dados, regras e permissões refletem exatamente este usuário.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  voltarParaAdministrador();
                  setAbaAtiva('dashboard');
                  setSubAbaVendas('TODOS');
                }}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-amber-900 px-3 py-1 font-bold text-xs shadow-2xs backdrop-blur-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Voltar para Administrador ({adminOriginal.nome})</span>
              </button>
            </div>
          </div>
        )}

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            {/* Se o usuário não tiver permissão para o módulo da aba ativa */}
            {!temAcessoAoModuloAtual ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Acesso Restrito ao Módulo
                </h3>
                <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  O seu usuário (<strong className="text-slate-800">{usuarioAtual.nome}</strong>) com perfil{' '}
                  <strong className="text-slate-800">{usuarioAtual.perfil_nome}</strong> não possui permissão de acesso para o módulo{' '}
                  <strong className="text-emerald-700">{moduloInfoAtual?.nome || abaAtiva}</strong>.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setAbaAtiva('dashboard')}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    Voltar para o Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                {abaAtiva === 'dashboard' && (
                  <DashboardView
                    onNovaVenda={handleAbrirNovaVenda}
                    onNavegarPara={(aba) => setAbaAtiva(aba)}
                    onEditarVenda={handleEditarVenda}
                  />
                )}

                {abaAtiva === 'minhas_vendas' && (
                  <VendorSalesList
                    onNovaVenda={handleAbrirNovaVenda}
                    onEditarVenda={handleEditarVenda}
                    onIrParaConferencia={handleIrParaConferencia}
                    subAbaVendas={subAbaVendas}
                    onSubAbaVendasChange={setSubAbaVendas}
                  />
                )}

                {abaAtiva === 'conferencia_vendedor' && <VendorConferenceReport />}

                {abaAtiva === 'aprovacoes' && <AdminApprovals />}

                {abaAtiva === 'repasses_admin' && <AdminRepasseBatch />}

                {abaAtiva === 'regras' && (
                  <CommissionSettings abaInicial="vendedores" />
                )}

                {abaAtiva === 'configuracoes' && (
                  <CommissionSettings abaInicial="vendedores" />
                )}

                {abaAtiva === 'usuarios' && (
                  <CommissionSettings abaInicial="usuarios" />
                )}

                {abaAtiva === 'identidade_visual' && (
                  <CommissionSettings abaInicial="identidade_visual" />
                )}

                {abaAtiva === 'importar_erp' && <ImportSalesModal />}

                {abaAtiva === 'stored_procedure' && <SqlStoredProcedureViewer />}
              </>
            )}
          </div>
        </main>

        {/* System Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 text-xs text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Sistema de Comissionamento Comercial</span>
              <span>•</span>
              <span>PostgreSQL PL/pgSQL Engine</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Controle RBAC (Vendedor / Administrador)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-blue-600" />
                Vigência Contratual Imutável
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-purple-600" />
                Liquidação Atômica em Lote
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Sales Entry Modal */}
      <SalesEntryModal
        isOpen={isModalVendaAberta}
        onClose={() => {
          setIsModalVendaAberta(false);
          setVendaEmEdicao(null);
        }}
        vendaParaEdicao={vendaEmEdicao}
      />
    </div>
  );
}

export default function Home() {
  return (
    <CommissionProvider>
      <DashboardApp />
    </CommissionProvider>
  );
}
