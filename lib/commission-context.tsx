'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  FaixaEntradaComissao,
  HistoricoEstorno,
  LancamentoComissao,
  MeioPagamentoConfig,
  MEIOS_PAGAMENTO_PADRAO,
  ParametrosComissionamento,
  PARAMETROS_COMISSIONAMENTO_PADRAO,
  RegraComissaoVendedor,
  Repasse,
  StatusLancamento,
  TipoComissao,
  TipoPagamentoEntrada,
  Usuario,
  Venda,
  ModuloSistemaId,
} from './types';
import { calcularComissao } from './commission-engine';
import { formatarDataBR, formatarMoedaBR } from './utils';
import {
  gerarPermissoesPadrao,
  normalizarPermissoesUsuario,
  checarPermissaoUsuario,
} from './permissions';

interface CommissionContextType {
  usuarios: Usuario[];
  usuarioAtual: Usuario;
  setUsuarioAtual: (usuario: Usuario) => void;
  salvarUsuario: (usuario: Omit<Usuario, 'id' | 'criado_em'> & { id?: string; senha?: string }) => Promise<{
    sucesso: boolean;
    mensagem: string;
    usuario?: Usuario;
  }>;
  toggleAtivoUsuario: (usuarioId: string) => Promise<{
    sucesso: boolean;
    mensagem: string;
    novoStatus?: boolean;
  }>;
  excluirUsuario: (usuarioId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  temPermissao: (
    moduloId: ModuloSistemaId,
    acao?: 'visualizar' | 'inserir' | 'alterar' | 'excluir'
  ) => boolean;
  regras: RegraComissaoVendedor[];
  vendas: Venda[];
  lancamentos: LancamentoComissao[];
  repasses: Repasse[];
  criarOuEditarVenda: (
    vendaData: {
      id?: string;
      numero_sequencial?: number;
      codigo_venda?: string;
      vendedor_id: string;
      numero_documento: string;
      cliente_nome: string;
      procedimentos?: string;
      data_venda: string;
      valor_total_venda: number;
      valor_entrada_valida: number;
      tipo_pagamento_entrada: TipoPagamentoEntrada;
    },
    submeterDiretamente?: boolean
  ) => Promise<{
    sucesso: boolean;
    mensagem: string;
    vendaId?: string;
    numero_sequencial?: number;
    codigo_venda?: string;
  }>;
  obterProximoNumeroSequencial: () => number;
  formatarCodigoVenda: (seq?: number) => string;
  excluirRascunho: (vendaId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  submeterParaAprovacao: (lancamentoId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  aprovarLancamento: (lancamentoId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  rejeitarLancamento: (lancamentoId: string, justificativa: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  conferirLancamento: (lancamentoId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  conferirLancamentosEmLote: (lancamentosIds: string[]) => Promise<{ sucesso: boolean; mensagem: string }>;
  liquidarRepasseLote: (dados: {
    vendedor_id: string;
    data_repasse: string;
    comprovante_transacao: string;
    lancamentos_ids: string[];
    observacoes?: string;
  }) => Promise<{ sucesso: boolean; mensagem: string; repasseId?: string; repasse?: Repasse; repasses?: Repasse[] }>;
  estornarLancamento: (lancamentoId: string, motivo: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  estornarComissaoPaga: (dados: {
    lancamentoId: string;
    motivo: string;
    formaCompensacao: 'DESCONTO_PROXIMO_REPASSE' | 'DEVOLUCAO_DIRETA';
    comprovanteDevolucao?: string;
  }) => { sucesso: boolean; mensagem: string };
  salvarRegra: (regra: Omit<RegraComissaoVendedor, 'id' | 'criado_em'> & { id?: string }) => Promise<{
    sucesso: boolean;
    mensagem: string;
    regraId?: string;
  }>;
  salvarRegraComissao: (regra: Omit<RegraComissaoVendedor, 'id' | 'criado_em'>) => Promise<{
    sucesso: boolean;
    mensagem: string;
  }>;
  excluirRegra: (regraId: string) => Promise<{ sucesso: boolean; mensagem: string; vendasAssociadas?: number }>;
  duplicarRegra: (regraId: string) => { sucesso: boolean; mensagem: string; novaRegra?: RegraComissaoVendedor };
  encerrarVigenciaRegra: (regraId: string, dataFim?: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  obterRegraVigente: (vendedorId: string, dataVenda: string) => RegraComissaoVendedor | undefined;
  parametros: ParametrosComissionamento;
  salvarParametros: (novos: Partial<ParametrosComissionamento>) => Promise<{ sucesso: boolean; mensagem: string }>;
  salvarMeioPagamento: (meio: Omit<MeioPagamentoConfig, 'id'> & { id?: string }) => Promise<{ sucesso: boolean; mensagem: string }>;
  excluirMeioPagamento: (meioId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  toggleMeioEntradaValida: (codigoOuId: string) => { sucesso: boolean; mensagem: string };
  toggleMeioAtivo: (codigoOuId: string) => { sucesso: boolean; mensagem: string };
  resetarMeiosPagamentoPadrao: () => { sucesso: boolean; mensagem: string };
  resetarParametros: () => void;
  resetarParaDadosIniciais: () => void;
  importarVendasLote: (novasVendas: Array<{
    numero_documento: string;
    cliente_nome: string;
    procedimentos?: string;
    data_venda: string;
    valor_total_venda: number;
    valor_entrada_valida: number;
    tipo_pagamento_entrada: TipoPagamentoEntrada;
    vendedor_id: string;
  }>, submeterAprovacao?: boolean) => Promise<{ inseridas: number; erros: string[] }>;
  // Autenticação & Sessão
  estaAutenticado: boolean;
  isLoading: boolean;
  syncError: string | null;
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; mensagem: string; usuario?: Usuario }>;
  logout: () => Promise<void>;
  // Impersonação / Navegação entre perfis pelo Administrador
  adminOriginal: Usuario | null;
  isImpersonating: boolean;
  incorporarUsuario: (usuarioId: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  voltarParaAdministrador: () => Promise<void>;
  // Identidade Visual & Logotipo
  logoEmpresa: string | null;
  salvarLogoEmpresa: (logo: string | null) => Promise<{ sucesso: boolean; mensagem: string }>;
  nomeEmpresa: string;
  salvarNomeEmpresa: (nome: string) => Promise<{ sucesso: boolean; mensagem: string }>;
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

const USUARIO_VAZIO: Usuario = {
  id: '',
  nome: '',
  email: '',
  cargo: '',
  perfil_id: 2,
  perfil_nome: 'VENDEDOR',
  ativo: true,
  criado_em: new Date().toISOString(),
  permissoes: [],
};

export function CommissionProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioAtual, setUsuarioAtualState] = useState<Usuario>(USUARIO_VAZIO);
  const [regras, setRegras] = useState<RegraComissaoVendedor[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoComissao[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [parametros, setParametros] = useState<ParametrosComissionamento>(PARAMETROS_COMISSIONAMENTO_PADRAO);
  const [estaAutenticado, setEstaAutenticado] = useState<boolean>(false);
  const [adminOriginal, setAdminOriginal] = useState<Usuario | null>(null);
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('Praxis Comissionamentos');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          setEstaAutenticado(false);
          setIsLoading(false);
          setIsHydrated(true);
          return;
        }
        const { usuario, adminOriginalId } = await meRes.json();
        const u: Usuario = { ...usuario, permissoes: normalizarPermissoesUsuario(usuario) };
        setUsuarioAtualState(u);
        setEstaAutenticado(true);

        if (adminOriginalId) {
          const adminRes = await fetch('/api/usuarios');
          if (adminRes.ok) {
            const todos: Usuario[] = await adminRes.json();
            const admin = todos.find((x) => x.id === adminOriginalId) || null;
            setAdminOriginal(admin);
          }
        } else if (usuario.perfil_nome === 'ADMINISTRADOR') {
          setAdminOriginal(u);
        }

        const isAdmin = u.perfil_nome === 'ADMINISTRADOR';
        const [vendasRes, lancRes, repassesRes, regrasRes, cfgRes, usuariosRes] = await Promise.all([
          fetch('/api/vendas'),
          fetch('/api/lancamentos'),
          fetch('/api/repasses'),
          fetch('/api/regras'),
          fetch('/api/configuracoes'),
          isAdmin ? fetch('/api/usuarios') : Promise.resolve(null),
        ]);

        if (vendasRes.ok) setVendas(await vendasRes.json());
        if (lancRes.ok) setLancamentos(await lancRes.json());
        if (repassesRes.ok) setRepasses(await repassesRes.json());
        if (regrasRes.ok) setRegras(await regrasRes.json());
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setParametros(cfg);
          setLogoEmpresa(cfg.logo_url || null);
          setNomeEmpresa(cfg.nome_empresa || 'Praxis Comissionamentos');
        }
        if (usuariosRes?.ok) {
          const todos: Usuario[] = await usuariosRes.json();
          setUsuarios(todos.map((x) => ({ ...x, permissoes: normalizarPermissoesUsuario(x) })));
        }
      } catch {
        setSyncError('Erro de conexão com o servidor. Verifique sua rede.');
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    };
    init();
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────

  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; mensagem: string; usuario?: Usuario }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Credenciais inválidas.' };

      const u: Usuario = { ...data.usuario, permissoes: normalizarPermissoesUsuario(data.usuario) };
      setUsuarioAtualState(u);
      setEstaAutenticado(true);
      if (u.perfil_nome === 'ADMINISTRADOR') setAdminOriginal(u);

      const [vendasRes, lancRes, repassesRes, regrasRes, cfgRes, usuariosRes] = await Promise.all([
        fetch('/api/vendas'),
        fetch('/api/lancamentos'),
        fetch('/api/repasses'),
        fetch('/api/regras'),
        fetch('/api/configuracoes'),
        u.perfil_nome === 'ADMINISTRADOR' ? fetch('/api/usuarios') : Promise.resolve(null),
      ]);
      if (vendasRes.ok) setVendas(await vendasRes.json());
      if (lancRes.ok) setLancamentos(await lancRes.json());
      if (repassesRes.ok) setRepasses(await repassesRes.json());
      if (regrasRes.ok) setRegras(await regrasRes.json());
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setParametros(cfg);
        setLogoEmpresa(cfg.logo_url || null);
        setNomeEmpresa(cfg.nome_empresa || 'Praxis Comissionamentos');
      }
      if (usuariosRes?.ok) {
        const todos: Usuario[] = await usuariosRes.json();
        setUsuarios(todos.map((x) => ({ ...x, permissoes: normalizarPermissoesUsuario(x) })));
      }

      return { sucesso: true, mensagem: `Bem-vindo(a), ${u.nome}!`, usuario: u };
    } catch {
      return { sucesso: false, mensagem: 'Erro de rede. Verifique sua conexão.' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setEstaAutenticado(false);
    setAdminOriginal(null);
    setUsuarioAtualState(USUARIO_VAZIO);
    setVendas([]);
    setLancamentos([]);
    setRepasses([]);
    setRegras([]);
    setUsuarios([]);
  };

  const incorporarUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const target = usuarios.find((u) => u.id === usuarioId);
    if (!target) return { sucesso: false, mensagem: 'Usuário não encontrado.' };
    if (usuarioAtual.perfil_nome !== 'ADMINISTRADOR' && !adminOriginal) {
      return { sucesso: false, mensagem: 'Apenas administradores podem navegar entre perfis.' };
    }
    const res = await fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId }),
    });
    if (!res.ok) {
      const d = await res.json();
      return { sucesso: false, mensagem: d.erro };
    }
    if (!adminOriginal) setAdminOriginal(usuarioAtual);
    setUsuarioAtualState(target);
    return { sucesso: true, mensagem: `Navegando como ${target.nome}.` };
  };

  const voltarParaAdministrador = async () => {
    await fetch('/api/auth/impersonate', { method: 'DELETE' });
    if (adminOriginal) setUsuarioAtualState(adminOriginal);
    setAdminOriginal(null);
  };

  const setUsuarioAtual = (usuario: Usuario) => {
    setUsuarioAtualState(usuario);
  };

  const isImpersonating = Boolean(adminOriginal && usuarioAtual && adminOriginal.id !== usuarioAtual.id);

  // ── Identidade Visual ───────────────────────────────────────────────────────

  const salvarLogoEmpresa = async (novoLogo: string | null): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: novoLogo }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar logo.' };
    setLogoEmpresa(novoLogo);
    setParametros((prev) => ({ ...prev, logo_url: novoLogo }));
    return { sucesso: true, mensagem: novoLogo ? 'Logo atualizado!' : 'Logo removido.' };
  };

  const salvarNomeEmpresa = async (novoNome: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const nome = novoNome.trim() || 'Praxis Comissionamentos';
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_empresa: nome }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar nome.' };
    setNomeEmpresa(nome);
    setParametros((prev) => ({ ...prev, nome_empresa: nome }));
    return { sucesso: true, mensagem: 'Nome da empresa atualizado!' };
  };

  // ── Utilitários locais ──────────────────────────────────────────────────────

  const obterRegraVigente = (vendedorId: string, dataVenda: string) => {
    return regras.find(
      (r) =>
        r.vendedor_id === vendedorId &&
        r.vigencia_inicio <= dataVenda &&
        (!r.vigencia_fim || r.vigencia_fim >= dataVenda)
    );
  };

  const formatarCodigoVenda = (seq?: number) => {
    if (!seq) return 'VEN-0001';
    return `VEN-${String(seq).padStart(4, '0')}`;
  };

  const obterProximoNumeroSequencial = () => {
    const max = vendas.reduce((acc, v) => Math.max(acc, v.numero_sequencial || 0), 0);
    return max + 1;
  };

  // ── Vendas & Lançamentos ────────────────────────────────────────────────────

  const criarOuEditarVenda = async (
    vendaData: {
      id?: string;
      numero_sequencial?: number;
      codigo_venda?: string;
      vendedor_id: string;
      numero_documento: string;
      cliente_nome: string;
      procedimentos?: string;
      data_venda: string;
      valor_total_venda: number;
      valor_entrada_valida: number;
      tipo_pagamento_entrada: TipoPagamentoEntrada;
    },
    submeterDiretamente = false
  ): Promise<{ sucesso: boolean; mensagem: string; vendaId?: string; numero_sequencial?: number; codigo_venda?: string }> => {
    try {
      const isEdicao = Boolean(vendaData.id);
      const url = isEdicao ? `/api/vendas/${vendaData.id}` : '/api/vendas';
      const method = isEdicao ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaData),
      });
      const data = await res.json();
      if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar venda.' };

      const { venda, lancamento } = data;
      setVendas((prev) => {
        const idx = prev.findIndex((v) => v.id === venda.id);
        return idx >= 0 ? prev.map((v) => (v.id === venda.id ? venda : v)) : [venda, ...prev];
      });
      setLancamentos((prev) => {
        const idx = prev.findIndex((l) => l.venda_id === venda.id);
        return idx >= 0 ? prev.map((l) => (l.venda_id === venda.id ? lancamento : l)) : [lancamento, ...prev];
      });

      if (submeterDiretamente && lancamento?.id) {
        await submeterParaAprovacao(lancamento.id);
      }

      return {
        sucesso: true,
        mensagem: submeterDiretamente
          ? `Venda ${venda.codigo_venda} enviada para aprovação!`
          : `Venda ${venda.codigo_venda} salva como rascunho!`,
        vendaId: venda.id,
        numero_sequencial: venda.numero_sequencial,
        codigo_venda: venda.codigo_venda,
      };
    } catch {
      return { sucesso: false, mensagem: 'Erro de rede ao salvar venda.' };
    }
  };

  const excluirRascunho = async (vendaId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) return { sucesso: false, mensagem: 'Venda não localizada.' };
    const lanc = lancamentos.find((l) => l.venda_id === vendaId);
    if (lanc && lanc.status !== 'RASCUNHO' && lanc.status !== 'REJEITADO') {
      return { sucesso: false, mensagem: `Não é possível excluir venda com status "${lanc.status}".` };
    }
    const prevVendas = vendas;
    const prevLanc = lancamentos;
    setVendas((prev) => prev.filter((v) => v.id !== vendaId));
    setLancamentos((prev) => prev.filter((l) => l.venda_id !== vendaId));
    const res = await fetch(`/api/vendas/${vendaId}`, { method: 'DELETE' });
    if (!res.ok) {
      setVendas(prevVendas);
      setLancamentos(prevLanc);
      return { sucesso: false, mensagem: 'Erro ao excluir venda no servidor.' };
    }
    return { sucesso: true, mensagem: `Rascunho ${venda.codigo_venda || venda.numero_documento} excluído.` };
  };

  const submeterParaAprovacao = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/submeter`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao submeter.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Lançamento enviado para aprovação!' };
  };

  const aprovarLancamento = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/aprovar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao aprovar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão aprovada!' };
  };

  const rejeitarLancamento = async (lancamentoId: string, justificativa: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/rejeitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa }),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao rejeitar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Lançamento rejeitado e devolvido ao vendedor.' };
  };

  const conferirLancamento = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/conferir`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao conferir.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão conferida!' };
  };

  const conferirLancamentosEmLote = async (lancamentosIds: string[]): Promise<{ sucesso: boolean; mensagem: string }> => {
    const resultados = await Promise.all(lancamentosIds.map((id) => conferirLancamento(id)));
    const falhas = resultados.filter((r) => !r.sucesso);
    if (falhas.length > 0) return { sucesso: false, mensagem: `${falhas.length} lançamento(s) com erro.` };
    return { sucesso: true, mensagem: `${lancamentosIds.length} comissão(ões) conferida(s)!` };
  };

  // ── Repasses ────────────────────────────────────────────────────────────────

  const liquidarRepasseLote = async (dados: {
    vendedor_id: string;
    data_repasse: string;
    comprovante_transacao: string;
    lancamentos_ids: string[];
    observacoes?: string;
  }): Promise<{ sucesso: boolean; mensagem: string; repasseId?: string; repasse?: Repasse; repasses?: Repasse[] }> => {
    const res = await fetch('/api/repasses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao criar repasse.' };
    const novosRepasses: Repasse[] = Array.isArray(data) ? data : [data];
    setRepasses((prev) => [...novosRepasses, ...prev]);
    const idsLiquidados = dados.lancamentos_ids;
    setLancamentos((prev) =>
      prev.map((l) => (idsLiquidados.includes(l.id) ? { ...l, status: 'LIQUIDADO' as StatusLancamento } : l))
    );
    return {
      sucesso: true,
      mensagem: `${novosRepasses.length} repasse(s) liquidado(s) com sucesso!`,
      repasseId: novosRepasses[0]?.id,
      repasse: novosRepasses[0],
      repasses: novosRepasses,
    };
  };

  // ── Estorno (pre-repasse via stored procedure) ──────────────────────────────

  const estornarLancamento = async (lancamentoId: string, motivo: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/estornar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao estornar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão estornada.' };
  };

  // Estorno pós-liquidação — lógica local (não coberta pelo backend neste sprint)
  const estornarComissaoPaga = (dados: {
    lancamentoId: string;
    motivo: string;
    formaCompensacao: 'DESCONTO_PROXIMO_REPASSE' | 'DEVOLUCAO_DIRETA';
    comprovanteDevolucao?: string;
  }) => {
    if (!dados.motivo?.trim()) {
      return { sucesso: false, mensagem: 'Informe obrigatoriamente a justificativa do estorno.' };
    }
    const lanc = lancamentos.find((l) => l.id === dados.lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento de comissão não localizado.' };
    if (lanc.status !== 'LIQUIDADO') {
      return { sucesso: false, mensagem: `Apenas lançamentos LIQUIDADO podem ser estornados por esta rotina. Status atual: ${lanc.status}.` };
    }

    const venda = vendas.find((v) => v.id === lanc.venda_id);
    const vendedor = usuarios.find((u) => u.id === lanc.vendedor_id);
    const valorEstorno = Math.abs(lanc.valor_comissao_calculado);
    const lancamentoAjusteId = dados.formaCompensacao === 'DESCONTO_PROXIMO_REPASSE' ? `lc-debito-${Date.now()}` : null;
    const dataAgora = new Date().toISOString();

    const historico: HistoricoEstorno = {
      motivo: dados.motivo.trim(),
      data: dataAgora,
      por: usuarioAtual.nome,
      tipo_estorno: 'POS_LIQUIDACAO',
      repasse_original_id: lanc.repasse_id || null,
      valor_estornado: valorEstorno,
      forma_compensacao: dados.formaCompensacao,
      compensado: dados.formaCompensacao === 'DEVOLUCAO_DIRETA',
      comprovante_devolucao: dados.formaCompensacao === 'DEVOLUCAO_DIRETA' ? dados.comprovanteDevolucao?.trim() || 'Devolução confirmada' : null,
      lancamento_ajuste_id: lancamentoAjusteId,
    };

    setLancamentos((prev) => {
      const atualizados = prev.map((l) =>
        l.id === dados.lancamentoId
          ? { ...l, status: 'ESTORNADO' as StatusLancamento, historico_estorno: historico }
          : l
      );
      if (dados.formaCompensacao === 'DESCONTO_PROXIMO_REPASSE') {
        const compensatorio: LancamentoComissao = {
          id: lancamentoAjusteId!,
          venda_id: lanc.venda_id,
          vendedor_id: lanc.vendedor_id,
          vendedor_nome: lanc.vendedor_nome || vendedor?.nome,
          regra_aplicada_id: lanc.regra_aplicada_id,
          valor_base_calculo: -(venda?.valor_total_venda || 0),
          percentual_entrada_calculado: lanc.percentual_entrada_calculado,
          entrada_valida_considerada: 0,
          aliquota_ou_fixo_aplicado: lanc.aliquota_ou_fixo_aplicado,
          tipo_regra_aplicada: 'VALOR_FIXO',
          valor_comissao_calculado: -valorEstorno,
          status: 'CONFERIDO',
          aprovado_por: usuarioAtual.id,
          aprovado_em: dataAgora,
          justificativa_rejeicao: `DÉBITO COMPENSATÓRIO: Estorno de comissão paga do contrato ${venda?.numero_documento || ''}`,
          is_debito_compensatorio: true,
          lancamento_estornado_origem_id: lanc.id,
        };
        return [compensatorio, ...atualizados];
      }
      return atualizados;
    });

    const detalhe = dados.formaCompensacao === 'DESCONTO_PROXIMO_REPASSE'
      ? `Um débito de -R$ ${valorEstorno.toFixed(2)} foi adicionado para o próximo repasse de ${vendedor?.nome || 'vendedor'}.`
      : `A devolução de R$ ${valorEstorno.toFixed(2)} foi registrada.`;
    return { sucesso: true, mensagem: `Comissão paga estornada com sucesso! ${detalhe}` };
  };

  // ── Regras ──────────────────────────────────────────────────────────────────

  const salvarRegra = async (regraData: Omit<RegraComissaoVendedor, 'id' | 'criado_em'> & { id?: string }): Promise<{ sucesso: boolean; mensagem: string; regraId?: string }> => {
    const res = await fetch('/api/regras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regraData),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar regra.' };
    setRegras((prev) => [data, ...prev.filter((r) => r.vendedor_id !== regraData.vendedor_id || r.vigencia_fim !== null)]);
    return { sucesso: true, mensagem: 'Regra de comissão salva com sucesso!', regraId: data.id };
  };

  const salvarRegraComissao = async (dados: Omit<RegraComissaoVendedor, 'id' | 'criado_em'>): Promise<{ sucesso: boolean; mensagem: string }> => {
    return salvarRegra(dados);
  };

  const excluirRegra = async (regraId: string): Promise<{ sucesso: boolean; mensagem: string; vendasAssociadas?: number }> => {
    const res = await fetch(`/api/regras/${regraId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      return { sucesso: false, mensagem: data.erro || 'Erro ao excluir regra.', vendasAssociadas: 1 };
    }
    setRegras((prev) => prev.filter((r) => r.id !== regraId));
    return { sucesso: true, mensagem: 'Regra excluída com sucesso.', vendasAssociadas: 0 };
  };

  const duplicarRegra = (regraId: string) => {
    const original = regras.find((r) => r.id === regraId);
    if (!original) return { sucesso: false, mensagem: 'Regra original não localizada.' };
    const novoId = `reg-${Date.now()}`;
    const hoje = new Date().toISOString().split('T')[0];
    const novaRegra: RegraComissaoVendedor = {
      ...original,
      id: novoId,
      vigencia_inicio: original.vigencia_fim && original.vigencia_fim >= hoje ? original.vigencia_fim : hoje,
      vigencia_fim: null,
      criado_em: new Date().toISOString(),
      faixas: original.faixas?.map((f, i) => ({ ...f, id: Date.now() + i, regra_id: novoId })) || [],
    };
    setRegras((prev) => [novaRegra, ...prev]);
    return { sucesso: true, mensagem: `Regra duplicada para ${original.vendedor_nome}!`, novaRegra };
  };

  const encerrarVigenciaRegra = async (regraId: string, dataFim?: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const regra = regras.find((r) => r.id === regraId);
    if (!regra) return { sucesso: false, mensagem: 'Regra não encontrada.' };
    const dataFinal = dataFim || new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/regras/${regraId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vigencia_fim: dataFinal }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao encerrar vigência.' };
    setRegras((prev) => prev.map((r) => (r.id === regraId ? { ...r, vigencia_fim: dataFinal } : r)));
    return { sucesso: true, mensagem: `Vigência encerrada em ${formatarDataBR(dataFinal)}.` };
  };

  // ── Configurações & Meios de Pagamento ──────────────────────────────────────

  const salvarParametros = async (novos: Partial<ParametrosComissionamento>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novos),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar configurações.' };
    setParametros((prev) => ({ ...prev, ...novos }));
    return { sucesso: true, mensagem: 'Parâmetros de comissionamento atualizados com sucesso!' };
  };

  const salvarMeioPagamento = async (meioData: Omit<MeioPagamentoConfig, 'id'> & { id?: string }): Promise<{ sucesso: boolean; mensagem: string }> => {
    const isEdicao = Boolean(meioData.id);
    const url = isEdicao ? `/api/configuracoes/meios-pagamento/${meioData.id}` : '/api/configuracoes/meios-pagamento';
    const method = isEdicao ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meioData),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar meio de pagamento.' };
    setParametros((prev) => {
      const cat = prev.meios_pagamento_catalogo || [];
      const idx = cat.findIndex((m) => m.id === data.id);
      const novoCat = idx >= 0 ? cat.map((m) => (m.id === data.id ? data : m)) : [...cat, data];
      const validos = novoCat.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);
      return { ...prev, meios_pagamento_catalogo: novoCat, meios_pagamento_entrada_validos: validos };
    });
    return { sucesso: true, mensagem: `Meio de pagamento "${data.label}" salvo!` };
  };

  const excluirMeioPagamento = async (meioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/configuracoes/meios-pagamento/${meioId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      return { sucesso: false, mensagem: data.erro || 'Erro ao excluir.' };
    }
    setParametros((prev) => {
      const novoCat = (prev.meios_pagamento_catalogo || []).filter((m) => m.id !== meioId);
      const validos = novoCat.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);
      return { ...prev, meios_pagamento_catalogo: novoCat, meios_pagamento_entrada_validos: validos };
    });
    return { sucesso: true, mensagem: 'Meio de pagamento excluído.' };
  };

  const toggleMeioEntradaValida = (codigoOuId: string) => {
    let label = '';
    let alteradoPara = false;
    setParametros((prev) => {
      const catalogo = prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
      const meio = catalogo.find((m) => m.id === codigoOuId || m.codigo === codigoOuId);
      if (!meio) return prev;
      label = meio.label;
      const novoStatus = !meio.is_entrada_valida;
      alteradoPara = novoStatus;
      const novoCatalogo = catalogo.map((m) => m.id === meio.id ? { ...m, is_entrada_valida: novoStatus } : m);
      let novosValidos = prev.meios_pagamento_entrada_validos || [];
      if (novoStatus && meio.ativo) {
        if (!novosValidos.includes(meio.codigo)) novosValidos = [...novosValidos, meio.codigo];
      } else {
        novosValidos = novosValidos.filter((c) => c !== meio.codigo);
      }
      return { ...prev, meios_pagamento_catalogo: novoCatalogo, meios_pagamento_entrada_validos: novosValidos };
    });
    return { sucesso: true, mensagem: `"${label}" agora ${alteradoPara ? 'PONTUA como Entrada Válida' : 'NÃO pontua como Entrada Válida'}.` };
  };

  const toggleMeioAtivo = (codigoOuId: string) => {
    let label = '';
    let ativoAtual = false;
    setParametros((prev) => {
      const catalogo = prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
      const meio = catalogo.find((m) => m.id === codigoOuId || m.codigo === codigoOuId);
      if (!meio) return prev;
      label = meio.label;
      const novoAtivo = !meio.ativo;
      ativoAtual = novoAtivo;
      const novoCatalogo = catalogo.map((m) => m.id === meio.id ? { ...m, ativo: novoAtivo } : m);
      let novosValidos = prev.meios_pagamento_entrada_validos || [];
      if (!novoAtivo) {
        novosValidos = novosValidos.filter((c) => c !== meio.codigo);
      } else if (meio.is_entrada_valida && !novosValidos.includes(meio.codigo)) {
        novosValidos = [...novosValidos, meio.codigo];
      }
      return { ...prev, meios_pagamento_catalogo: novoCatalogo, meios_pagamento_entrada_validos: novosValidos };
    });
    return { sucesso: true, mensagem: `"${label}" ${ativoAtual ? 'ativado' : 'desativado'}.` };
  };

  const resetarMeiosPagamentoPadrao = () => {
    setParametros((prev) => ({
      ...prev,
      meios_pagamento_catalogo: MEIOS_PAGAMENTO_PADRAO,
      meios_pagamento_entrada_validos: ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA'],
    }));
    return { sucesso: true, mensagem: 'Meios de pagamento restaurados para os padrões nativos!' };
  };

  const resetarParametros = () => {
    setParametros(PARAMETROS_COMISSIONAMENTO_PADRAO);
  };

  // ── Usuários ─────────────────────────────────────────────────────────────────

  const salvarUsuario = async (
    usuarioData: Omit<Usuario, 'id' | 'criado_em'> & { id?: string; senha?: string }
  ): Promise<{ sucesso: boolean; mensagem: string; usuario?: Usuario }> => {
    const isEdicao = Boolean(usuarioData.id);
    const url = isEdicao ? `/api/usuarios/${usuarioData.id}` : '/api/usuarios';
    const method = isEdicao ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar usuário.' };
    const u: Usuario = { ...data, permissoes: normalizarPermissoesUsuario(data) };
    setUsuarios((prev) => {
      const idx = prev.findIndex((x) => x.id === u.id);
      return idx >= 0 ? prev.map((x) => (x.id === u.id ? u : x)) : [...prev, u];
    });
    return { sucesso: true, mensagem: isEdicao ? 'Usuário atualizado!' : 'Usuário criado!', usuario: u };
  };

  const toggleAtivoUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string; novoStatus?: boolean }> => {
    const u = usuarios.find((x) => x.id === usuarioId);
    if (!u) return { sucesso: false, mensagem: 'Usuário não encontrado.' };
    const novoAtivo = !u.ativo;
    const res = await fetch(`/api/usuarios/${usuarioId}/ativo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: novoAtivo }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao alterar status.' };
    setUsuarios((prev) => prev.map((x) => (x.id === usuarioId ? { ...x, ativo: novoAtivo } : x)));
    return { sucesso: true, mensagem: `Usuário ${novoAtivo ? 'ativado' : 'inativado'}.`, novoStatus: novoAtivo };
  };

  const excluirUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/usuarios/${usuarioId}`, { method: 'DELETE' });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao excluir usuário.' };
    setUsuarios((prev) => prev.filter((x) => x.id !== usuarioId));
    return { sucesso: true, mensagem: 'Usuário excluído.' };
  };

  // ── Importação em lote ───────────────────────────────────────────────────────

  const importarVendasLote = async (
    novasVendas: Array<{
      numero_documento: string;
      cliente_nome: string;
      procedimentos?: string;
      data_venda: string;
      valor_total_venda: number;
      valor_entrada_valida: number;
      tipo_pagamento_entrada: TipoPagamentoEntrada;
      vendedor_id: string;
    }>,
    submeterAprovacao = false
  ): Promise<{ inseridas: number; erros: string[] }> => {
    const erros: string[] = [];
    let inseridas = 0;
    for (let i = 0; i < novasVendas.length; i++) {
      const item = novasVendas[i];
      const resultado = await criarOuEditarVenda(item, submeterAprovacao);
      if (resultado.sucesso) {
        inseridas++;
      } else {
        erros.push(`Linha ${i + 1} (${item.numero_documento}): ${resultado.mensagem}`);
      }
    }
    return { inseridas, erros };
  };

  // ── Permissões ───────────────────────────────────────────────────────────────

  const temPermissao = (
    moduloId: ModuloSistemaId,
    acao: 'visualizar' | 'inserir' | 'alterar' | 'excluir' = 'visualizar'
  ): boolean => {
    return checarPermissaoUsuario(usuarioAtual, moduloId, acao);
  };

  const resetarParaDadosIniciais = () => {
    setVendas([]);
    setLancamentos([]);
    setRepasses([]);
    setRegras([]);
    setParametros(PARAMETROS_COMISSIONAMENTO_PADRAO);
  };

  // ── Context value ────────────────────────────────────────────────────────────

  const value: CommissionContextType = {
    usuarios,
    usuarioAtual,
    setUsuarioAtual,
    salvarUsuario,
    toggleAtivoUsuario,
    excluirUsuario,
    temPermissao,
    regras,
    vendas,
    lancamentos,
    repasses,
    criarOuEditarVenda,
    obterProximoNumeroSequencial,
    formatarCodigoVenda,
    excluirRascunho,
    submeterParaAprovacao,
    aprovarLancamento,
    rejeitarLancamento,
    conferirLancamento,
    conferirLancamentosEmLote,
    liquidarRepasseLote,
    estornarLancamento,
    estornarComissaoPaga,
    salvarRegra,
    salvarRegraComissao,
    excluirRegra,
    duplicarRegra,
    encerrarVigenciaRegra,
    obterRegraVigente,
    parametros,
    salvarParametros,
    salvarMeioPagamento,
    excluirMeioPagamento,
    toggleMeioEntradaValida,
    toggleMeioAtivo,
    resetarMeiosPagamentoPadrao,
    resetarParametros,
    resetarParaDadosIniciais,
    importarVendasLote,
    estaAutenticado,
    isLoading,
    syncError,
    login,
    logout,
    adminOriginal,
    isImpersonating,
    incorporarUsuario,
    voltarParaAdministrador,
    logoEmpresa,
    salvarLogoEmpresa,
    nomeEmpresa,
    salvarNomeEmpresa,
  };

  return <CommissionContext.Provider value={value}>{children}</CommissionContext.Provider>;
}

export function useCommission() {
  const context = useContext(CommissionContext);
  if (!context) {
    throw new Error('useCommission deve ser usado dentro de um CommissionProvider');
  }
  return context;
}
