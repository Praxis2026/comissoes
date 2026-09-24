import { ModuloSistemaId, MODULOS_SISTEMA, PerfilTipo, PermissaoModulo, Usuario } from './types';

/**
 * Gera as permissões padrão para um determinado perfil de usuário
 */
export function gerarPermissoesPadrao(perfil: PerfilTipo): PermissaoModulo[] {
  switch (perfil) {
    case 'ADMINISTRADOR':
      // Administrador possui acesso e controle total em todos os módulos
      return MODULOS_SISTEMA.map((m) => ({
        modulo: m.id,
        acesso: true,
        inserir: m.permiteInserir ?? true,
        alterar: m.permiteAlterar ?? true,
        excluir: m.permiteExcluir ?? true,
      }));

    case 'GERENTE':
      // Gerente Comercial tem visão geral, vendas, conferência, aprovações e importação
      return MODULOS_SISTEMA.map((m) => {
        if (m.id === 'dashboard') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: false, excluir: false };
        }
        if (m.id === 'minhas_vendas') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: true };
        }
        if (m.id === 'conferencia_vendedor') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: false };
        }
        if (m.id === 'aprovacoes') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: false };
        }
        if (m.id === 'importar_erp') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: false };
        }
        if (m.id === 'repasses_admin') {
          return { modulo: m.id, acesso: true, inserir: false, alterar: false, excluir: false };
        }
        // configuracoes fechado por padrão para gerente
        return { modulo: m.id, acesso: false, inserir: false, alterar: false, excluir: false };
      });

    case 'AUDITOR':
      // Auditor tem acesso somente leitura nos módulos operacionais
      return MODULOS_SISTEMA.map((m) => {
        const comAcesso = ['dashboard', 'minhas_vendas', 'conferencia_vendedor', 'aprovacoes', 'repasses_admin'].includes(m.id);
        return {
          modulo: m.id,
          acesso: comAcesso,
          inserir: false,
          alterar: false,
          excluir: false,
        };
      });

    case 'VENDEDOR':
    default:
      // Vendedor tem acesso ao Dashboard, Minhas Vendas e Conferência
      return MODULOS_SISTEMA.map((m) => {
        if (m.id === 'dashboard') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: false, excluir: false };
        }
        if (m.id === 'minhas_vendas') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: true };
        }
        if (m.id === 'conferencia_vendedor') {
          return { modulo: m.id, acesso: true, inserir: true, alterar: true, excluir: false };
        }
        return {
          modulo: m.id,
          acesso: false,
          inserir: false,
          alterar: false,
          excluir: false,
        };
      });
  }
}

/**
 * Garante que o usuário possua todas as permissões de módulo preenchidas
 */
export function normalizarPermissoesUsuario(usuario: Usuario): PermissaoModulo[] {
  const padrao = gerarPermissoesPadrao(usuario.perfil_nome);
  if (!usuario.permissoes || usuario.permissoes.length === 0) {
    return padrao;
  }

  // Preenche eventuais novos módulos que não estavam no array salvo
  return MODULOS_SISTEMA.map((m) => {
    const existente = usuario.permissoes?.find((p) => p.modulo === m.id);
    if (existente) {
      return {
        modulo: m.id,
        acesso: Boolean(existente.acesso),
        inserir: Boolean(existente.inserir && (m.permiteInserir ?? true)),
        alterar: Boolean(existente.alterar && (m.permiteAlterar ?? true)),
        excluir: Boolean(existente.excluir && (m.permiteExcluir ?? true)),
      };
    }
    const defaultMod = padrao.find((p) => p.modulo === m.id);
    return defaultMod || { modulo: m.id, acesso: false, inserir: false, alterar: false, excluir: false };
  });
}

/**
 * Verifica se um usuário possui determinada permissão (visualizar, inserir, alterar, excluir) em um módulo
 */
export function checarPermissaoUsuario(
  usuario: Usuario | null | undefined,
  moduloId: ModuloSistemaId,
  acao: 'visualizar' | 'inserir' | 'alterar' | 'excluir' = 'visualizar'
): boolean {
  if (!usuario) return false;
  if (!usuario.ativo) return false; // Usuário inativo perde todas as permissões

  // Se o usuário for administrador sem permissões customizadas, acesso total irrestrito
  if (usuario.perfil_nome === 'ADMINISTRADOR' && (!usuario.permissoes || usuario.permissoes.length === 0)) {
    return true;
  }

  const permissoes = normalizarPermissoesUsuario(usuario);
  const perm = permissoes.find((p) => p.modulo === moduloId);

  if (!perm || !perm.acesso) {
    return false;
  }

  if (acao === 'visualizar') return perm.acesso;
  if (acao === 'inserir') return perm.inserir;
  if (acao === 'alterar') return perm.alterar;
  if (acao === 'excluir') return perm.excluir;

  return false;
}
