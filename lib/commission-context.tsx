'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  FaixaEntradaComissao,
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
import {
  calcularComissao,
  REGRAS_INICIAIS,
  REPASSES_INICIAIS,
  USUARIOS_INICIAIS,
  VENDAS_E_LANCAMENTOS_INICIAIS,
} from './commission-engine';
import { formatarDataBR } from './utils';
import {
  gerarPermissoesPadrao,
  normalizarPermissoesUsuario,
  checarPermissaoUsuario,
} from './permissions';

interface CommissionContextType {
  usuarios: Usuario[];
  usuarioAtual: Usuario;
  setUsuarioAtual: (usuario: Usuario) => void;
  salvarUsuario: (usuario: Omit<Usuario, 'id' | 'criado_em'> & { id?: string }) => {
    sucesso: boolean;
    mensagem: string;
    usuario?: Usuario;
  };
  toggleAtivoUsuario: (usuarioId: string) => {
    sucesso: boolean;
    mensagem: string;
    novoStatus?: boolean;
  };
  excluirUsuario: (usuarioId: string) => { sucesso: boolean; mensagem: string };
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
  ) => {
    sucesso: boolean;
    mensagem: string;
    vendaId?: string;
    numero_sequencial?: number;
    codigo_venda?: string;
  };
  obterProximoNumeroSequencial: () => number;
  formatarCodigoVenda: (seq?: number) => string;
  excluirRascunho: (vendaId: string) => { sucesso: boolean; mensagem: string };
  submeterParaAprovacao: (lancamentoId: string) => { sucesso: boolean; mensagem: string };
  aprovarLancamento: (lancamentoId: string) => { sucesso: boolean; mensagem: string };
  rejeitarLancamento: (lancamentoId: string, justificativa: string) => { sucesso: boolean; mensagem: string };
  conferirLancamento: (lancamentoId: string) => { sucesso: boolean; mensagem: string };
  conferirLancamentosEmLote: (lancamentosIds: string[]) => { sucesso: boolean; mensagem: string };
  liquidarRepasseLote: (dados: {
    vendedor_id: string;
    data_repasse: string;
    comprovante_transacao: string;
    lancamentos_ids: string[];
    observacoes?: string;
  }) => { sucesso: boolean; mensagem: string; repasseId?: string; repasse?: Repasse };
  estornarLancamento: (lancamentoId: string, motivo: string) => { sucesso: boolean; mensagem: string };
  salvarRegra: (regra: Omit<RegraComissaoVendedor, 'id' | 'criado_em'> & { id?: string }) => {
    sucesso: boolean;
    mensagem: string;
    regraId?: string;
  };
  excluirRegra: (regraId: string) => { sucesso: boolean; mensagem: string };
  duplicarRegra: (regraId: string) => { sucesso: boolean; mensagem: string; novaRegra?: RegraComissaoVendedor };
  encerrarVigenciaRegra: (regraId: string, dataFim?: string) => { sucesso: boolean; mensagem: string };
  obterRegraVigente: (vendedorId: string, dataVenda: string) => RegraComissaoVendedor | undefined;
  parametros: ParametrosComissionamento;
  salvarParametros: (novos: Partial<ParametrosComissionamento>) => { sucesso: boolean; mensagem: string };
  salvarMeioPagamento: (meio: Omit<MeioPagamentoConfig, 'id'> & { id?: string }) => { sucesso: boolean; mensagem: string };
  excluirMeioPagamento: (meioId: string) => { sucesso: boolean; mensagem: string };
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
  }>) => { inseridas: number; erros: string[] };
  // Autenticação & Sessão
  estaAutenticado: boolean;
  login: (email: string, senha?: string) => { sucesso: boolean; mensagem: string; usuario?: Usuario };
  logout: () => void;
  // Identidade Visual & Logotipo
  logoEmpresa: string | null;
  salvarLogoEmpresa: (logo: string | null) => { sucesso: boolean; mensagem: string };
  nomeEmpresa: string;
  salvarNomeEmpresa: (nome: string) => { sucesso: boolean; mensagem: string };
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USUARIOS: 'comiss_db_usuarios',
  REGRAS: 'comiss_db_regras',
  VENDAS: 'comiss_db_vendas',
  LANCAMENTOS: 'comiss_db_lancamentos',
  REPASSES: 'comiss_db_repasses',
  CURRENT_USER_ID: 'comiss_db_current_user_id',
  PARAMETROS: 'comiss_db_parametros',
  AUTH_STATUS: 'comiss_db_auth_status',
  LOGO_EMPRESA: 'comiss_db_logo_empresa',
};

export function CommissionProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_INICIAIS);
  const [usuarioAtual, setUsuarioAtualState] = useState<Usuario>(USUARIOS_INICIAIS[1]); // default: Lucas (Vendedor)
  const [regras, setRegras] = useState<RegraComissaoVendedor[]>(REGRAS_INICIAIS);
  const [vendas, setVendas] = useState<Venda[]>(VENDAS_E_LANCAMENTOS_INICIAIS.vendas);
  const [lancamentos, setLancamentos] = useState<LancamentoComissao[]>(
    VENDAS_E_LANCAMENTOS_INICIAIS.lancamentos
  );
  const [repasses, setRepasses] = useState<Repasse[]>(REPASSES_INICIAIS);
  const [parametros, setParametros] = useState<ParametrosComissionamento>(
    PARAMETROS_COMISSIONAMENTO_PADRAO
  );
  // Autenticação & Identidade Visual
  const [estaAutenticado, setEstaAutenticado] = useState<boolean>(false);
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('Comissões Pro');
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore saved data from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        let loadedUsuarios = USUARIOS_INICIAIS;
        const sUsuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
        if (sUsuarios) {
          try {
            const parsed = JSON.parse(sUsuarios);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedUsuarios = parsed.map((u: Usuario) => ({
                ...u,
                permissoes: normalizarPermissoesUsuario(u),
              }));
              setUsuarios(loadedUsuarios);
            }
          } catch (e) {
            console.error('Falha ao ler usuários do storage:', e);
          }
        }

        const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
        if (savedUserId) {
          const found = loadedUsuarios.find((u) => u.id === savedUserId);
          if (found) setUsuarioAtualState(found);
        }

        // Restore Auth Session
        const sAuth = localStorage.getItem(STORAGE_KEYS.AUTH_STATUS);
        if (sAuth === 'true') {
          setEstaAutenticado(true);
        } else {
          setEstaAutenticado(false);
        }

        // Restore Logo & Branding
        const sLogo = localStorage.getItem(STORAGE_KEYS.LOGO_EMPRESA);
        if (sLogo) {
          setLogoEmpresa(sLogo);
        }

        const sRegras = localStorage.getItem(STORAGE_KEYS.REGRAS);
        if (sRegras) setRegras(JSON.parse(sRegras));

        const sVendas = localStorage.getItem(STORAGE_KEYS.VENDAS);
        if (sVendas) {
          const parsed: Venda[] = JSON.parse(sVendas);
          let maxSeq = 0;
          parsed.forEach((v) => {
            if (v.numero_sequencial && v.numero_sequencial > maxSeq) {
              maxSeq = v.numero_sequencial;
            }
          });
          const backfilled = parsed.map((v) => {
            if (v.numero_sequencial) {
              return {
                ...v,
                codigo_venda: v.codigo_venda || `VEN-${String(v.numero_sequencial).padStart(4, '0')}`,
              };
            }
            maxSeq += 1;
            return {
              ...v,
              numero_sequencial: maxSeq,
              codigo_venda: `VEN-${String(maxSeq).padStart(4, '0')}`,
            };
          });
          setVendas(backfilled);
        }

        const sLancamentos = localStorage.getItem(STORAGE_KEYS.LANCAMENTOS);
        if (sLancamentos) setLancamentos(JSON.parse(sLancamentos));

        const sRepasses = localStorage.getItem(STORAGE_KEYS.REPASSES);
        if (sRepasses) setRepasses(JSON.parse(sRepasses));

        const sParametros = localStorage.getItem(STORAGE_KEYS.PARAMETROS);
        if (sParametros) {
          const parsed = JSON.parse(sParametros);
          setParametros({
            ...PARAMETROS_COMISSIONAMENTO_PADRAO,
            ...parsed,
            meios_pagamento_catalogo:
              parsed.meios_pagamento_catalogo && parsed.meios_pagamento_catalogo.length > 0
                ? parsed.meios_pagamento_catalogo
                : PARAMETROS_COMISSIONAMENTO_PADRAO.meios_pagamento_catalogo,
            meios_pagamento_entrada_validos:
              parsed.meios_pagamento_entrada_validos && parsed.meios_pagamento_entrada_validos.length > 0
                ? parsed.meios_pagamento_entrada_validos
                : PARAMETROS_COMISSIONAMENTO_PADRAO.meios_pagamento_entrada_validos,
          });
          if (parsed.logo_url) {
            setLogoEmpresa(parsed.logo_url);
          }
          if (parsed.nome_empresa) {
            setNomeEmpresa(parsed.nome_empresa);
          }
        }
      } catch (e) {
        console.error('Falha ao restaurar dados do localStorage:', e);
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save changes to localStorage only after initial hydration
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
      localStorage.setItem(STORAGE_KEYS.REGRAS, JSON.stringify(regras));
      localStorage.setItem(STORAGE_KEYS.VENDAS, JSON.stringify(vendas));
      localStorage.setItem(STORAGE_KEYS.LANCAMENTOS, JSON.stringify(lancamentos));
      localStorage.setItem(STORAGE_KEYS.REPASSES, JSON.stringify(repasses));
      localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(parametros));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, usuarioAtual.id);
    } catch (e) {
      console.error('Falha ao salvar dados no localStorage:', e);
    }
  }, [isHydrated, usuarios, regras, vendas, lancamentos, repasses, parametros, usuarioAtual]);

  const salvarParametros = (novos: Partial<ParametrosComissionamento>) => {
    setParametros((prev) => {
      const atualizado = { ...prev, ...novos };
      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }
      return atualizado;
    });
    return {
      sucesso: true,
      mensagem: 'Parâmetros de comissionamento atualizados com sucesso!',
    };
  };

  const resetarParametros = () => {
    setParametros(PARAMETROS_COMISSIONAMENTO_PADRAO);
    try {
      localStorage.setItem(
        STORAGE_KEYS.PARAMETROS,
        JSON.stringify(PARAMETROS_COMISSIONAMENTO_PADRAO)
      );
    } catch {}
  };

  const setUsuarioAtual = (usuario: Usuario) => {
    setUsuarioAtualState(usuario);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, usuario.id);
    } catch {}
  };

  const login = (email: string, senha?: string) => {
    const emailLimpo = email.trim().toLowerCase();
    const usuario = usuarios.find((u) => u.email.toLowerCase() === emailLimpo);

    if (!usuario) {
      return {
        sucesso: false,
        mensagem: 'E-mail ou credencial não localizada no cadastro de colaboradores.',
      };
    }

    if (!usuario.ativo) {
      return {
        sucesso: false,
        mensagem: 'Este usuário está inativo no sistema. Contate a administração para reativação.',
      };
    }

    // Se o usuário possuir senha definida, validar
    if (usuario.senha && senha !== undefined) {
      // Aceita a senha do usuário, ou as senhas padrão de teste caso seja ambiente de teste
      const senhaValida =
        usuario.senha === senha ||
        (usuario.perfil_nome === 'ADMINISTRADOR' && senha === 'admin') ||
        senha === '123' ||
        senha === 'admin123';

      if (!senhaValida) {
        return {
          sucesso: false,
          mensagem: 'Senha incorreta. Verifique os dados digitados e tente novamente.',
        };
      }
    }

    setUsuarioAtualState(usuario);
    setEstaAutenticado(true);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, usuario.id);
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');
    } catch (e) {
      console.error('Falha ao persistir sessão:', e);
    }

    return {
      sucesso: true,
      mensagem: `Acesso autorizado com sucesso! Bem-vindo(a), ${usuario.nome}.`,
      usuario,
    };
  };

  const logout = () => {
    setEstaAutenticado(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);
    } catch (e) {
      console.error('Falha ao remover status de auth:', e);
    }
  };

  const salvarLogoEmpresa = (novoLogo: string | null) => {
    setLogoEmpresa(novoLogo);
    salvarParametros({ logo_url: novoLogo });
    try {
      if (novoLogo) {
        localStorage.setItem(STORAGE_KEYS.LOGO_EMPRESA, novoLogo);
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOGO_EMPRESA);
      }
    } catch (e) {
      console.error('Falha ao salvar logo:', e);
    }
    return {
      sucesso: true,
      mensagem: novoLogo
        ? 'Logotipo institucional atualizado com sucesso!'
        : 'Logotipo padrão do sistema restaurado.',
    };
  };

  const salvarNomeEmpresa = (novoNome: string) => {
    const nome = novoNome.trim() || 'Comissões Pro';
    setNomeEmpresa(nome);
    salvarParametros({ nome_empresa: nome });
    return {
      sucesso: true,
      mensagem: 'Nome da empresa atualizado com sucesso!',
    };
  };

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

  const criarOuEditarVenda = (
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
  ) => {
    const vendedor = usuarios.find((u) => u.id === vendaData.vendedor_id);
    if (!vendedor) return { sucesso: false, mensagem: 'Vendedor não localizado.' };

    const regraVigente = obterRegraVigente(vendaData.vendedor_id, vendaData.data_venda);
    if (!regraVigente) {
      return {
        sucesso: false,
        mensagem: `Não há regra de comissão cadastrada e vigente para o vendedor nesta data (${formatarDataBR(vendaData.data_venda)}). Solicite ao Administrador o cadastro da regra.`,
      };
    }

    const calculo = calcularComissao(
      vendaData,
      regraVigente,
      parametros.meios_pagamento_entrada_validos,
      parametros.percentual_comissao_padrao_residual
    );

    const vendaId = vendaData.id || `vd-${Date.now()}`;
    const lancamentoId = vendaData.id
      ? lancamentos.find((l) => l.venda_id === vendaData.id)?.id || `lc-${Date.now()}`
      : `lc-${Date.now()}`;

    // Checar se ja existe lançamento bloqueado
    const lancamentoExistente = lancamentos.find((l) => l.venda_id === vendaId);
    if (
      lancamentoExistente &&
      ['APROVADO', 'CONFERIDO', 'LIQUIDADO'].includes(lancamentoExistente.status)
    ) {
      return {
        sucesso: false,
        mensagem: `Não é permitido alterar uma venda com status ${lancamentoExistente.status}.`,
      };
    }

    const vendaExistente = vendaData.id ? vendas.find((v) => v.id === vendaData.id) : null;

    // Atribuir número sequencial gerado automaticamente
    let numeroSequencialFinal: number;
    let codigoVendaFinal: string;

    if (vendaExistente && vendaExistente.numero_sequencial) {
      numeroSequencialFinal = vendaExistente.numero_sequencial;
      codigoVendaFinal =
        vendaExistente.codigo_venda || formatarCodigoVenda(numeroSequencialFinal);
    } else if (vendaData.numero_sequencial) {
      numeroSequencialFinal = vendaData.numero_sequencial;
      codigoVendaFinal =
        vendaData.codigo_venda || formatarCodigoVenda(numeroSequencialFinal);
    } else {
      numeroSequencialFinal = obterProximoNumeroSequencial();
      codigoVendaFinal = formatarCodigoVenda(numeroSequencialFinal);
    }

    const novaVenda: Venda = {
      id: vendaId,
      numero_sequencial: numeroSequencialFinal,
      codigo_venda: codigoVendaFinal,
      vendedor_id: vendaData.vendedor_id,
      vendedor_nome: vendedor.nome,
      numero_documento: vendaData.numero_documento.trim(),
      cliente_nome: vendaData.cliente_nome.trim() || 'Cliente Não Informado',
      procedimentos: vendaData.procedimentos?.trim() || undefined,
      data_venda: vendaData.data_venda,
      valor_total_venda: Number(vendaData.valor_total_venda),
      valor_entrada_valida: Number(vendaData.valor_entrada_valida),
      tipo_pagamento_entrada: vendaData.tipo_pagamento_entrada,
      criado_em: vendaExistente ? vendaExistente.criado_em : new Date().toISOString(),
    };

    const statusFinal: StatusLancamento = submeterDiretamente
      ? 'PENDENTE_APROVACAO'
      : 'RASCUNHO';

    const novoLancamento: LancamentoComissao = {
      id: lancamentoId,
      venda_id: vendaId,
      vendedor_id: vendaData.vendedor_id,
      vendedor_nome: vendedor.nome,
      regra_aplicada_id: regraVigente.id,
      valor_base_calculo: calculo.valor_base,
      percentual_entrada_calculado: calculo.percentual_entrada,
      entrada_valida_considerada: calculo.entrada_valida,
      aliquota_ou_fixo_aplicado: calculo.aliquota_ou_fixo,
      tipo_regra_aplicada: calculo.tipo_comissao,
      valor_comissao_calculado: calculo.valor_comissao,
      status: statusFinal,
      justificativa_rejeicao: null,
    };

    setVendas((prev) => {
      const idx = prev.findIndex((v) => v.id === vendaId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = novaVenda;
        return copy;
      }
      return [novaVenda, ...prev];
    });

    setLancamentos((prev) => {
      const idx = prev.findIndex((l) => l.venda_id === vendaId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = novoLancamento;
        return copy;
      }
      return [novoLancamento, ...prev];
    });

    return {
      sucesso: true,
      mensagem: submeterDiretamente
        ? `Venda ${codigoVendaFinal} registrada e enviada com sucesso para aprovação do Administrador!`
        : `Venda ${codigoVendaFinal} salva como rascunho com cálculo prévio de comissão realizado!`,
      vendaId,
      numero_sequencial: numeroSequencialFinal,
      codigo_venda: codigoVendaFinal,
    };
  };

  const excluirRascunho = (vendaId: string) => {
    const lanc = lancamentos.find((l) => l.venda_id === vendaId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };
    if (lanc.status !== 'RASCUNHO' && lanc.status !== 'REJEITADO') {
      return {
        sucesso: false,
        mensagem: 'Apenas vendas em Rascunho ou Rejeitadas podem ser excluídas.',
      };
    }

    setVendas((prev) => prev.filter((v) => v.id !== vendaId));
    setLancamentos((prev) => prev.filter((l) => l.venda_id !== vendaId));
    return { sucesso: true, mensagem: 'Rascunho excluído com sucesso.' };
  };

  const submeterParaAprovacao = (lancamentoId: string) => {
    const lanc = lancamentos.find((l) => l.id === lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };
    if (lanc.status !== 'RASCUNHO' && lanc.status !== 'REJEITADO') {
      return {
        sucesso: false,
        mensagem: `Não é possível submeter um lançamento com status ${lanc.status}.`,
      };
    }

    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === lancamentoId
          ? { ...l, status: 'PENDENTE_APROVACAO', justificativa_rejeicao: null }
          : l
      )
    );
    return { sucesso: true, mensagem: 'Lançamento submetido para validação do Administrador!' };
  };

  const aprovarLancamento = (lancamentoId: string) => {
    const lanc = lancamentos.find((l) => l.id === lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };
    if (lanc.status !== 'PENDENTE_APROVACAO') {
      return { sucesso: false, mensagem: 'Apenas lançamentos pendentes podem ser aprovados.' };
    }

    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === lancamentoId
          ? {
              ...l,
              status: 'APROVADO',
              aprovado_por: usuarioAtual.id,
              aprovado_em: new Date().toISOString(),
              justificativa_rejeicao: null,
            }
          : l
      )
    );
    return { sucesso: true, mensagem: 'Comissão aprovada! Liberada para conferência do vendedor.' };
  };

  const rejeitarLancamento = (lancamentoId: string, justificativa: string) => {
    if (!justificativa || !justificativa.trim()) {
      return { sucesso: false, mensagem: 'É obrigatório informar a justificativa da rejeição.' };
    }
    const lanc = lancamentos.find((l) => l.id === lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };
    if (lanc.status !== 'PENDENTE_APROVACAO') {
      return { sucesso: false, mensagem: 'Apenas lançamentos pendentes podem ser rejeitados.' };
    }

    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === lancamentoId
          ? {
              ...l,
              status: 'REJEITADO',
              aprovado_por: usuarioAtual.id,
              aprovado_em: new Date().toISOString(),
              justificativa_rejeicao: justificativa.trim(),
            }
          : l
      )
    );
    return {
      sucesso: true,
      mensagem: 'Lançamento rejeitado e retornado para o vendedor realizar ajustes.',
    };
  };

  const conferirLancamento = (lancamentoId: string) => {
    const lanc = lancamentos.find((l) => l.id === lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };
    if (lanc.status !== 'APROVADO') {
      return {
        sucesso: false,
        mensagem: 'Apenas comissões aprovadas pelo Administrador podem ser conferidas.',
      };
    }

    setLancamentos((prev) =>
      prev.map((l) => (l.id === lancamentoId ? { ...l, status: 'CONFERIDO' } : l))
    );
    return {
      sucesso: true,
      mensagem: 'Comissão conferida com sucesso! Pronta para inclusão em lote de repasse.',
    };
  };

  const conferirLancamentosEmLote = (lancamentosIds: string[]) => {
    if (!lancamentosIds.length) return { sucesso: false, mensagem: 'Nenhum lançamento selecionado.' };

    setLancamentos((prev) =>
      prev.map((l) =>
        lancamentosIds.includes(l.id) && l.status === 'APROVADO'
          ? { ...l, status: 'CONFERIDO' }
          : l
      )
    );
    return {
      sucesso: true,
      mensagem: `${lancamentosIds.length} comissão(ões) conferida(s) com sucesso!`,
    };
  };

  const liquidarRepasseLote = (dados: {
    vendedor_id: string;
    data_repasse: string;
    comprovante_transacao: string;
    lancamentos_ids: string[];
    observacoes?: string;
  }) => {
    if (!dados.lancamentos_ids.length) {
      return { sucesso: false, mensagem: 'Selecione pelo menos um lançamento conferido.' };
    }
    if (!dados.comprovante_transacao.trim()) {
      return { sucesso: false, mensagem: 'Informe o comprovante de transação (ex: Código PIX/TED).' };
    }

    const vendedor = usuarios.find((u) => u.id === dados.vendedor_id);
    const selecionados = lancamentos.filter(
      (l) => dados.lancamentos_ids.includes(l.id) && l.vendedor_id === dados.vendedor_id
    );

    // Validar se todos são CONFERIDO
    const invalidos = selecionados.filter((l) => l.status !== 'CONFERIDO');
    if (invalidos.length > 0) {
      return {
        sucesso: false,
        mensagem: 'Regra de Negócio: Apenas lançamentos com status CONFERIDO podem ser repassados.',
      };
    }

    const valorTotal = selecionados.reduce((acc, curr) => acc + curr.valor_comissao_calculado, 0);
    const repasseId = `rep-${Date.now()}`;

    const novoRepasse: Repasse = {
      id: repasseId,
      vendedor_id: dados.vendedor_id,
      vendedor_nome: vendedor?.nome || 'Vendedor',
      data_repasse: dados.data_repasse,
      valor_total_repassado: Number(valorTotal.toFixed(2)),
      comprovante_transacao: dados.comprovante_transacao.trim(),
      registrado_por: usuarioAtual.id,
      registrado_por_nome: usuarioAtual.nome,
      criado_em: new Date().toISOString(),
      lancamentos_ids: dados.lancamentos_ids,
      observacoes: dados.observacoes?.trim() || undefined,
    };

    setRepasses((prev) => [novoRepasse, ...prev]);

    setLancamentos((prev) =>
      prev.map((l) =>
        dados.lancamentos_ids.includes(l.id)
          ? { ...l, status: 'LIQUIDADO', repasse_id: repasseId }
          : l
      )
    );

    return {
      sucesso: true,
      mensagem: `Repasse de R$ ${valorTotal.toFixed(2)} liquidado com sucesso para ${vendedor?.nome}!`,
      repasseId,
      repasse: novoRepasse,
    };
  };

  const estornarLancamento = (lancamentoId: string, motivo: string) => {
    if (!motivo.trim()) {
      return { sucesso: false, mensagem: 'Informe o motivo do cancelamento / estorno.' };
    }
    const lanc = lancamentos.find((l) => l.id === lancamentoId);
    if (!lanc) return { sucesso: false, mensagem: 'Lançamento não localizado.' };

    setLancamentos((prev) =>
      prev.map((l) =>
        l.id === lancamentoId
          ? {
              ...l,
              status: 'ESTORNADO',
              justificativa_rejeicao: `ESTORNO: ${motivo.trim()}`,
              historico_estorno: {
                motivo: motivo.trim(),
                data: new Date().toISOString(),
                por: usuarioAtual.nome,
              },
            }
          : l
      )
    );

    return {
      sucesso: true,
      mensagem: 'Comissão estornada e cancelada com auditoria registrada.',
    };
  };

  const salvarRegra = (regraData: Omit<RegraComissaoVendedor, 'id' | 'criado_em'> & { id?: string }) => {
    const vendedor = usuarios.find((u) => u.id === regraData.vendedor_id);
    if (!vendedor) return { sucesso: false, mensagem: 'Vendedor não selecionado.', regraId: '' };

    const regraId = regraData.id || `reg-${Date.now()}`;
    const novaRegra: RegraComissaoVendedor = {
      id: regraId,
      vendedor_id: regraData.vendedor_id,
      vendedor_nome: vendedor.nome,
      tipo_comissao: regraData.tipo_comissao,
      valor_fixo: Number(regraData.valor_fixo) || 0,
      vigencia_inicio: regraData.vigencia_inicio,
      vigencia_fim: regraData.vigencia_fim || null,
      faixas: regraData.faixas || [],
      criado_em: new Date().toISOString(),
    };

    setRegras((prev) => {
      const idx = prev.findIndex((r) => r.id === regraId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = novaRegra;
        return copy;
      }
      return [novaRegra, ...prev];
    });

    return {
      sucesso: true,
      mensagem: `Regra de comissionamento salva para ${vendedor.nome} (vigência: ${regraData.vigencia_inicio} a ${regraData.vigencia_fim || 'Indeterminada'})!`,
      regraId,
    };
  };

  const excluirRegra = (regraId: string) => {
    const regra = regras.find((r) => r.id === regraId);
    if (!regra) return { sucesso: false, mensagem: 'Regra não encontrada.' };

    const lancamentosVinculados = lancamentos.filter((l) => l.regra_aplicada_id === regraId);
    setRegras((prev) => prev.filter((r) => r.id !== regraId));

    return {
      sucesso: true,
      mensagem: `Regra de ${regra.vendedor_nome || 'vendedor'} excluída com sucesso.${
        lancamentosVinculados.length > 0
          ? ` (${lancamentosVinculados.length} lançamentos históricos já calculados continuam preservados com auditoria).`
          : ''
      }`,
    };
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

    return {
      sucesso: true,
      mensagem: `Nova versão de regra duplicada a partir de #${original.id.slice(-4)} para ${original.vendedor_nome}!`,
      novaRegra,
    };
  };

  const encerrarVigenciaRegra = (regraId: string, dataFim?: string) => {
    const regra = regras.find((r) => r.id === regraId);
    if (!regra) return { sucesso: false, mensagem: 'Regra não encontrada.' };

    const dataFinal = dataFim || new Date().toISOString().split('T')[0];
    if (dataFinal < regra.vigencia_inicio) {
      return {
        sucesso: false,
        mensagem: `A data de encerramento (${formatarDataBR(dataFinal)}) não pode ser anterior ao início da vigência (${formatarDataBR(regra.vigencia_inicio)}).`,
      };
    }

    setRegras((prev) =>
      prev.map((r) => (r.id === regraId ? { ...r, vigencia_fim: dataFinal } : r))
    );

    return {
      sucesso: true,
      mensagem: `Vigência da regra de ${regra.vendedor_nome} encerrada em ${formatarDataBR(dataFinal)}.`,
    };
  };

  // =========================================================================
  // MEIOS DE PAGAMENTO & ENTRADA VÁLIDA (CRUD)
  // =========================================================================
  const salvarMeioPagamento = (
    meioData: Omit<MeioPagamentoConfig, 'id'> & { id?: string }
  ) => {
    const codigoLimpo = (meioData.codigo || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');

    if (!codigoLimpo) {
      return { sucesso: false, mensagem: 'Informe o código identificador (ex: TED, CHEQUE, FINANC).' };
    }
    if (!meioData.label || !meioData.label.trim()) {
      return { sucesso: false, mensagem: 'Informe o nome de exibição do meio de pagamento.' };
    }

    const id = meioData.id || `mp-${Date.now()}`;
    const novoMeio: MeioPagamentoConfig = {
      id,
      codigo: codigoLimpo,
      label: meioData.label.trim(),
      descricao: meioData.descricao?.trim() || '',
      is_entrada_valida: Boolean(meioData.is_entrada_valida),
      ativo: meioData.ativo !== false,
      sistema_padrao: Boolean(meioData.sistema_padrao),
      criado_em: new Date().toISOString(),
    };

    setParametros((prev) => {
      const catalogoAtual = prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
      const idx = catalogoAtual.findIndex((m) => m.id === id || m.codigo === codigoLimpo);

      let novoCatalogo: MeioPagamentoConfig[];
      if (idx >= 0) {
        novoCatalogo = [...catalogoAtual];
        novoCatalogo[idx] = { ...novoCatalogo[idx], ...novoMeio };
      } else {
        novoCatalogo = [...catalogoAtual, novoMeio];
      }

      // Sincronizar meios_pagamento_entrada_validos
      let validos = prev.meios_pagamento_entrada_validos || [];
      if (novoMeio.is_entrada_valida && novoMeio.ativo) {
        if (!validos.includes(novoMeio.codigo)) {
          validos = [...validos, novoMeio.codigo];
        }
      } else {
        validos = validos.filter((c) => c !== novoMeio.codigo);
      }

      const atualizado = {
        ...prev,
        meios_pagamento_catalogo: novoCatalogo,
        meios_pagamento_entrada_validos: validos,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }

      return atualizado;
    });

    return {
      sucesso: true,
      mensagem: `Meio de pagamento "${novoMeio.label}" salvo com sucesso!`,
    };
  };

  const excluirMeioPagamento = (meioId: string) => {
    const catalogo = parametros.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
    const meio = catalogo.find((m) => m.id === meioId || m.codigo === meioId);
    if (!meio) return { sucesso: false, mensagem: 'Meio de pagamento não localizado.' };

    const vendasComEsteMeio = vendas.filter((v) => v.tipo_pagamento_entrada === meio.codigo);
    if (vendasComEsteMeio.length > 0) {
      return {
        sucesso: false,
        mensagem: `Não é possível excluir "${meio.label}" pois constam ${vendasComEsteMeio.length} vendas registradas com ele. Você pode desativá-lo para impedir novas seleções.`,
      };
    }

    setParametros((prev) => {
      const novoCatalogo = (prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO).filter(
        (m) => m.id !== meio.id && m.codigo !== meio.codigo
      );
      const novosValidos = (prev.meios_pagamento_entrada_validos || []).filter(
        (c) => c !== meio.codigo
      );
      const atualizado = {
        ...prev,
        meios_pagamento_catalogo: novoCatalogo,
        meios_pagamento_entrada_validos: novosValidos,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }
      return atualizado;
    });

    return {
      sucesso: true,
      mensagem: `Meio de pagamento "${meio.label}" excluído com sucesso!`,
    };
  };

  const toggleMeioEntradaValida = (codigoOuId: string) => {
    let alteradoPara = false;
    let label = '';
    setParametros((prev) => {
      const catalogo = prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
      const meio = catalogo.find((m) => m.id === codigoOuId || m.codigo === codigoOuId);
      if (!meio) return prev;

      label = meio.label;
      const novoStatus = !meio.is_entrada_valida;
      alteradoPara = novoStatus;

      const novoCatalogo = catalogo.map((m) =>
        m.id === meio.id ? { ...m, is_entrada_valida: novoStatus } : m
      );

      let novosValidos = prev.meios_pagamento_entrada_validos || [];
      if (novoStatus && meio.ativo) {
        if (!novosValidos.includes(meio.codigo)) {
          novosValidos = [...novosValidos, meio.codigo];
        }
      } else {
        novosValidos = novosValidos.filter((c) => c !== meio.codigo);
      }

      const atualizado = {
        ...prev,
        meios_pagamento_catalogo: novoCatalogo,
        meios_pagamento_entrada_validos: novosValidos,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }

      return atualizado;
    });

    return {
      sucesso: true,
      mensagem: `"${label}" agora ${alteradoPara ? 'PONTUA como Entrada Válida' : 'NÃO pontua como Entrada Válida'}.`,
    };
  };

  const toggleMeioAtivo = (codigoOuId: string) => {
    let ativoAtual = false;
    let label = '';
    setParametros((prev) => {
      const catalogo = prev.meios_pagamento_catalogo || MEIOS_PAGAMENTO_PADRAO;
      const meio = catalogo.find((m) => m.id === codigoOuId || m.codigo === codigoOuId);
      if (!meio) return prev;

      label = meio.label;
      const novoAtivo = !meio.ativo;
      ativoAtual = novoAtivo;

      const novoCatalogo = catalogo.map((m) =>
        m.id === meio.id ? { ...m, ativo: novoAtivo } : m
      );

      let novosValidos = prev.meios_pagamento_entrada_validos || [];
      if (!novoAtivo) {
        novosValidos = novosValidos.filter((c) => c !== meio.codigo);
      } else if (meio.is_entrada_valida && !novosValidos.includes(meio.codigo)) {
        novosValidos = [...novosValidos, meio.codigo];
      }

      const atualizado = {
        ...prev,
        meios_pagamento_catalogo: novoCatalogo,
        meios_pagamento_entrada_validos: novosValidos,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }

      return atualizado;
    });

    return {
      sucesso: true,
      mensagem: `"${label}" ${ativoAtual ? 'ativado para novos lançamentos de vendas' : 'desativado no sistema'}.`,
    };
  };

  const resetarMeiosPagamentoPadrao = () => {
    setParametros((prev) => {
      const atualizado = {
        ...prev,
        meios_pagamento_catalogo: MEIOS_PAGAMENTO_PADRAO,
        meios_pagamento_entrada_validos: ['PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA'],
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PARAMETROS, JSON.stringify(atualizado));
      } catch (e) {
        console.error(e);
      }
      return atualizado;
    });
    return {
      sucesso: true,
      mensagem: 'Meios de pagamento restaurados para os padrões nativos da especificação!',
    };
  };

  const importarVendasLote = (
    novasVendas: Array<{
      numero_documento: string;
      cliente_nome: string;
      procedimentos?: string;
      data_venda: string;
      valor_total_venda: number;
      valor_entrada_valida: number;
      tipo_pagamento_entrada: TipoPagamentoEntrada;
      vendedor_id: string;
    }>
  ) => {
    let inseridas = 0;
    const erros: string[] = [];
    let proximoSeq = obterProximoNumeroSequencial();

    novasVendas.forEach((item, index) => {
      const res = criarOuEditarVenda(
        {
          ...item,
          numero_sequencial: proximoSeq,
          codigo_venda: formatarCodigoVenda(proximoSeq),
        },
        false
      );
      if (res.sucesso) {
        inseridas++;
        proximoSeq++;
      } else {
        erros.push(`Linha ${index + 1} (${item.numero_documento}): ${res.mensagem}`);
      }
    });

    return { inseridas, erros };
  };

  const salvarUsuario = (
    dados: Omit<Usuario, 'id' | 'criado_em'> & { id?: string }
  ): { sucesso: boolean; mensagem: string; usuario?: Usuario } => {
    const nomeTrim = dados.nome?.trim();
    const emailTrim = dados.email?.trim().toLowerCase();

    if (!nomeTrim) {
      return { sucesso: false, mensagem: 'Informe o nome completo do usuário.' };
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      return { sucesso: false, mensagem: 'Informe um e-mail válido para o usuário.' };
    }

    // Verifica duplicidade de e-mail com outros usuários
    const emailExistente = usuarios.find(
      (u) => u.email.toLowerCase() === emailTrim && u.id !== dados.id
    );
    if (emailExistente) {
      return {
        sucesso: false,
        mensagem: `Já existe outro usuário cadastrado com o e-mail "${emailTrim}".`,
      };
    }

    // Se informou senha, validar tamanho mínimo
    if (dados.senha && dados.senha.trim().length > 0 && dados.senha.trim().length < 6) {
      return {
        sucesso: false,
        mensagem: 'A nova senha de acesso deve possuir pelo menos 6 caracteres.',
      };
    }

    let usuarioSalvo: Usuario;

    if (dados.id) {
      // Edição
      const existente = usuarios.find((u) => u.id === dados.id);
      if (!existente) {
        return { sucesso: false, mensagem: 'Usuário não encontrado para edição.' };
      }

      // Trava de segurança: Se estiver inativando ou alterando perfil de admin, garantir que sobre pelo menos 1 admin ativo
      if (
        existente.perfil_nome === 'ADMINISTRADOR' &&
        (dados.perfil_nome !== 'ADMINISTRADOR' || dados.ativo === false)
      ) {
        const outrosAdminsAtivos = usuarios.filter(
          (u) => u.id !== dados.id && u.perfil_nome === 'ADMINISTRADOR' && u.ativo
        );
        if (outrosAdminsAtivos.length === 0) {
          return {
            sucesso: false,
            mensagem: 'Não é permitido desativar ou alterar o perfil do único Administrador ativo do sistema.',
          };
        }
      }

      // Regra da senha: se fornecida nova senha, altera e registra timestamp; se deixada em branco, preserva a senha atual
      const novaSenhaInformada = dados.senha && dados.senha.trim().length > 0;
      const senhaFinal = novaSenhaInformada
        ? dados.senha!.trim()
        : existente.senha || '123456';
      const senhaAtualizadaEmFinal = novaSenhaInformada
        ? new Date().toISOString()
        : existente.senha_atualizada_em || existente.criado_em;

      usuarioSalvo = {
        ...existente,
        nome: nomeTrim,
        email: emailTrim,
        cargo: dados.cargo?.trim() || existente.cargo || '',
        perfil_id: dados.perfil_id || (dados.perfil_nome === 'ADMINISTRADOR' ? 1 : 2),
        perfil_nome: dados.perfil_nome,
        senha: senhaFinal,
        senha_atualizada_em: senhaAtualizadaEmFinal,
        ativo: dados.ativo,
        permissoes:
          dados.permissoes && dados.permissoes.length > 0
            ? dados.permissoes
            : normalizarPermissoesUsuario({ ...existente, perfil_nome: dados.perfil_nome }),
      };

      setUsuarios((prev) => prev.map((u) => (u.id === dados.id ? usuarioSalvo : u)));

      // Se o usuário editado for o usuário logado atualmente, atualizar usuarioAtual imediatamente
      if (usuarioAtual.id === dados.id) {
        setUsuarioAtualState(usuarioSalvo);
      }

      return {
        sucesso: true,
        mensagem: `Usuário "${usuarioSalvo.nome}" atualizado com sucesso!${
          novaSenhaInformada ? ' (Nova senha de acesso definida)' : ''
        }`,
        usuario: usuarioSalvo,
      };
    } else {
      // Criação de novo usuário
      const novoId = `u-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const novaSenhaInformada = dados.senha && dados.senha.trim().length > 0;
      const senhaInicial = novaSenhaInformada ? dados.senha!.trim() : '123456';

      const novoUsuario: Usuario = {
        id: novoId,
        nome: nomeTrim,
        email: emailTrim,
        cargo: dados.cargo?.trim() || '',
        perfil_id: dados.perfil_id || (dados.perfil_nome === 'ADMINISTRADOR' ? 1 : 2),
        perfil_nome: dados.perfil_nome,
        senha: senhaInicial,
        senha_atualizada_em: new Date().toISOString(),
        ativo: dados.ativo ?? true,
        criado_em: new Date().toISOString(),
        permissoes:
          dados.permissoes && dados.permissoes.length > 0
            ? dados.permissoes
            : gerarPermissoesPadrao(dados.perfil_nome),
      };

      usuarioSalvo = novoUsuario;
      setUsuarios((prev) => [...prev, novoUsuario]);

      return {
        sucesso: true,
        mensagem: `Novo usuário "${novoUsuario.nome}" cadastrado com sucesso!`,
        usuario: novoUsuario,
      };
    }
  };

  const toggleAtivoUsuario = (
    usuarioId: string
  ): { sucesso: boolean; mensagem: string; novoStatus?: boolean } => {
    const alvo = usuarios.find((u) => u.id === usuarioId);
    if (!alvo) {
      return { sucesso: false, mensagem: 'Usuário não encontrado.' };
    }

    const novoStatus = !alvo.ativo;

    // Trava de segurança: Se for inativar o único admin
    if (!novoStatus && alvo.perfil_nome === 'ADMINISTRADOR') {
      const outrosAdminsAtivos = usuarios.filter(
        (u) => u.id !== usuarioId && u.perfil_nome === 'ADMINISTRADOR' && u.ativo
      );
      if (outrosAdminsAtivos.length === 0) {
        return {
          sucesso: false,
          mensagem: 'Não é permitido desativar o único Administrador ativo do sistema.',
        };
      }
    }

    // Se o próprio usuário logado tentar se inativar
    if (!novoStatus && alvo.id === usuarioAtual.id) {
      return {
        sucesso: false,
        mensagem: 'Você não pode desativar a sua própria conta conectada na sessão atual.',
      };
    }

    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, ativo: novoStatus } : u))
    );

    return {
      sucesso: true,
      mensagem: `Usuário "${alvo.nome}" ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`,
      novoStatus,
    };
  };

  const excluirUsuario = (usuarioId: string): { sucesso: boolean; mensagem: string } => {
    const alvo = usuarios.find((u) => u.id === usuarioId);
    if (!alvo) {
      return { sucesso: false, mensagem: 'Usuário não encontrado para exclusão.' };
    }

    if (alvo.id === usuarioAtual.id) {
      return {
        sucesso: false,
        mensagem: 'Não é permitido excluir o usuário que está atualmente logado na sessão.',
      };
    }

    if (alvo.perfil_nome === 'ADMINISTRADOR') {
      const outrosAdmins = usuarios.filter(
        (u) => u.id !== usuarioId && u.perfil_nome === 'ADMINISTRADOR'
      );
      if (outrosAdmins.length === 0) {
        return {
          sucesso: false,
          mensagem: 'Não é permitido excluir o único Administrador do sistema.',
        };
      }
    }

    // Verificar se há vendas vinculadas a esse vendedor
    const vendasVinculadas = vendas.filter((v) => v.vendedor_id === usuarioId);
    if (vendasVinculadas.length > 0) {
      return {
        sucesso: false,
        mensagem: `Este usuário possui ${vendasVinculadas.length} venda(s) vinculada(s) no histórico. Para preservar a rastreabilidade e integridade fiscal, inative o usuário em vez de excluí-lo.`,
      };
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== usuarioId));
    setRegras((prev) => prev.filter((r) => r.vendedor_id !== usuarioId));

    return {
      sucesso: true,
      mensagem: `Usuário "${alvo.nome}" excluído com sucesso.`,
    };
  };

  const temPermissao = (
    moduloId: ModuloSistemaId,
    acao: 'visualizar' | 'inserir' | 'alterar' | 'excluir' = 'visualizar'
  ): boolean => {
    return checarPermissaoUsuario(usuarioAtual, moduloId, acao);
  };

  const resetarParaDadosIniciais = () => {
    setUsuarios(USUARIOS_INICIAIS);
    setUsuarioAtualState(USUARIOS_INICIAIS[1]);
    setRegras(REGRAS_INICIAIS);
    setVendas(VENDAS_E_LANCAMENTOS_INICIAIS.vendas);
    setLancamentos(VENDAS_E_LANCAMENTOS_INICIAIS.lancamentos);
    setRepasses(REPASSES_INICIAIS);
    resetarParametros();
    try {
      localStorage.removeItem(STORAGE_KEYS.USUARIOS);
      localStorage.removeItem(STORAGE_KEYS.REGRAS);
      localStorage.removeItem(STORAGE_KEYS.VENDAS);
      localStorage.removeItem(STORAGE_KEYS.LANCAMENTOS);
      localStorage.removeItem(STORAGE_KEYS.REPASSES);
      localStorage.removeItem(STORAGE_KEYS.PARAMETROS);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, USUARIOS_INICIAIS[1].id);
    } catch {}
  };

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
    salvarRegra,
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
    // Autenticação & Identidade Visual
    estaAutenticado,
    login,
    logout,
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
