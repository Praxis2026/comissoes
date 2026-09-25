'use client';

import React, { useState, useMemo } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  MODULOS_SISTEMA,
  ModuloSistemaId,
  PerfilTipo,
  PermissaoModulo,
  Usuario,
} from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  gerarPermissoesPadrao,
  normalizarPermissoesUsuario,
} from '@/lib/permissions';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  Info,
  KeyRound,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Unlock,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';

interface UserManagementProps {
  onFeedback?: (tipo: 'sucesso' | 'erro', texto: string) => void;
}

export function UserManagement({ onFeedback }: UserManagementProps) {
  const {
    usuarios,
    usuarioAtual,
    salvarUsuario,
    toggleAtivoUsuario,
    excluirUsuario,
    temPermissao,
    adminOriginal,
    incorporarUsuario,
  } = useCommission();

  // Filtros e busca
  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('TODOS');

  // Modal de Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<Usuario | null>(null);

  // Formulário de Cadastro / Edição
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formPerfil, setFormPerfil] = useState<PerfilTipo>('VENDEDOR');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formSenha, setFormSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [formPermissoes, setFormPermissoes] = useState<PermissaoModulo[]>([]);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Modal de Detalhes / Inspeção de Permissões
  const [modalDetalhesUsuario, setModalDetalhesUsuario] = useState<Usuario | null>(null);

  // Diálogo de confirmação de exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);

  // Feedback inline
  const [avisoLocal, setAvisoLocal] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );

  const dispararFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setAvisoLocal({ tipo, texto });
    if (onFeedback) onFeedback(tipo, texto);
    setTimeout(() => setAvisoLocal(null), 5000);
  };

  // Pode gerenciar usuários? (verificação de permissão no módulo configuracoes)
  const podeInserir = temPermissao('configuracoes', 'inserir');
  const podeAlterar = temPermissao('configuracoes', 'alterar');
  const podeExcluir = temPermissao('configuracoes', 'excluir');

  // Métricas rápidas
  const metricas = useMemo(() => {
    const total = usuarios.length;
    const ativos = usuarios.filter((u) => u.ativo).length;
    const inativos = usuarios.filter((u) => !u.ativo).length;
    const admins = usuarios.filter((u) => u.perfil_nome === 'ADMINISTRADOR').length;
    const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR').length;
    return { total, ativos, inativos, admins, vendedores };
  }, [usuarios]);

  // Lista filtrada
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca =
        !busca ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase()) ||
        (u.cargo && u.cargo.toLowerCase().includes(busca.toLowerCase()));

      const matchSituacao =
        filtroSituacao === 'TODOS'
          ? true
          : filtroSituacao === 'ATIVO'
          ? u.ativo
          : !u.ativo;

      const matchPerfil =
        filtroPerfil === 'TODOS' ? true : u.perfil_nome === filtroPerfil;

      return matchBusca && matchSituacao && matchPerfil;
    });
  }, [usuarios, busca, filtroSituacao, filtroPerfil]);

  // Abre modal para cadastrar novo usuário
  const abrirNovoUsuario = () => {
    setUsuarioEdicao(null);
    setFormNome('');
    setFormEmail('');
    setFormCargo('Consultor Comercial');
    setFormPerfil('VENDEDOR');
    setFormAtivo(true);
    setFormSenha('');
    setMostrarSenha(false);
    setFormPermissoes(gerarPermissoesPadrao('VENDEDOR'));
    setErroForm(null);
    setModalAberto(true);
  };

  // Abre modal para editar usuário existente
  const abrirEditarUsuario = (u: Usuario) => {
    setUsuarioEdicao(u);
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormCargo(u.cargo || '');
    setFormPerfil(u.perfil_nome);
    setFormAtivo(u.ativo);
    setFormSenha('');
    setMostrarSenha(false);
    setFormPermissoes(normalizarPermissoesUsuario(u));
    setErroForm(null);
    setModalAberto(true);
  };

  // Abre modal para duplicar permissões em um novo usuário
  const abrirDuplicarUsuario = (origem: Usuario) => {
    setUsuarioEdicao(null);
    setFormNome('');
    setFormEmail('');
    setFormCargo(origem.cargo || '');
    setFormPerfil(origem.perfil_nome);
    setFormAtivo(true);
    setFormSenha('');
    setMostrarSenha(false);
    setFormPermissoes(normalizarPermissoesUsuario(origem));
    setErroForm(null);
    setModalAberto(true);
  };

  // Troca de perfil no formulário (carrega permissões sugeridas)
  const handleTrocarPerfilForm = (novoPerfil: PerfilTipo) => {
    setFormPerfil(novoPerfil);
    // Recalcula sugestão de permissões para o perfil escolhido
    setFormPermissoes(gerarPermissoesPadrao(novoPerfil));
  };

  // Aplica presets rápidos de permissão no formulário
  const aplicarPreset = (tipo: 'ADMIN' | 'VENDEDOR' | 'GERENTE' | 'LEITURA' | 'LIMPAR') => {
    if (tipo === 'ADMIN') {
      setFormPermissoes(gerarPermissoesPadrao('ADMINISTRADOR'));
    } else if (tipo === 'VENDEDOR') {
      setFormPermissoes(gerarPermissoesPadrao('VENDEDOR'));
    } else if (tipo === 'GERENTE') {
      setFormPermissoes(gerarPermissoesPadrao('GERENTE'));
    } else if (tipo === 'LEITURA') {
      setFormPermissoes(
        MODULOS_SISTEMA.map((m) => ({
          modulo: m.id,
          acesso: true,
          inserir: false,
          alterar: false,
          excluir: false,
        }))
      );
    } else if (tipo === 'LIMPAR') {
      setFormPermissoes(
        MODULOS_SISTEMA.map((m) => ({
          modulo: m.id,
          acesso: false,
          inserir: false,
          alterar: false,
          excluir: false,
        }))
      );
    }
  };

  // Alterna permissão de um módulo específico no formulário
  const atualizarPermissaoModulo = (
    moduloId: ModuloSistemaId,
    campo: 'acesso' | 'inserir' | 'alterar' | 'excluir',
    valor: boolean
  ) => {
    setFormPermissoes((prev) =>
      prev.map((p) => {
        if (p.modulo !== moduloId) return p;

        if (campo === 'acesso') {
          // Se desativar o acesso, desativa também as ações dependentes
          if (!valor) {
            return {
              ...p,
              acesso: false,
              inserir: false,
              alterar: false,
              excluir: false,
            };
          }
          return { ...p, acesso: true };
        }

        // Se ativar uma ação, garante que o acesso ao módulo esteja ligado
        return {
          ...p,
          acesso: true,
          [campo]: valor,
        };
      })
    );
  };

  // Alterna todas as permissões de uma linha/módulo
  const toggleTodasPermissoesLinha = (moduloId: ModuloSistemaId) => {
    setFormPermissoes((prev) =>
      prev.map((p) => {
        if (p.modulo !== moduloId) return p;
        const moduloDef = MODULOS_SISTEMA.find((m) => m.id === moduloId);
        const tudoLigado =
          p.acesso &&
          (!moduloDef?.permiteInserir || p.inserir) &&
          (!moduloDef?.permiteAlterar || p.alterar) &&
          (!moduloDef?.permiteExcluir || p.excluir);

        if (tudoLigado) {
          return { modulo: moduloId, acesso: false, inserir: false, alterar: false, excluir: false };
        } else {
          return {
            modulo: moduloId,
            acesso: true,
            inserir: moduloDef?.permiteInserir ?? true,
            alterar: moduloDef?.permiteAlterar ?? true,
            excluir: moduloDef?.permiteExcluir ?? true,
          };
        }
      })
    );
  };

  // Salvar usuário
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    const nomeTrim = formNome.trim();
    const emailTrim = formEmail.trim().toLowerCase();

    if (!nomeTrim) {
      setErroForm('O nome do usuário é obrigatório.');
      return;
    }

    if (!emailTrim || !emailTrim.includes('@')) {
      setErroForm('Informe um endereço de e-mail institucional válido.');
      return;
    }

    // Pelo menos 1 módulo com acesso para não criar usuário 'fantasma'
    const temAlgumAcesso = formPermissoes.some((p) => p.acesso);
    if (!temAlgumAcesso && formAtivo) {
      setErroForm(
        'Atenção: Um usuário ativo deve possuir acesso a pelo menos um módulo do sistema.'
      );
      return;
    }

    const senhaTrim = formSenha.trim();
    if (senhaTrim && senhaTrim.length < 6) {
      setErroForm('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    const resultado = await salvarUsuario({
      id: usuarioEdicao?.id,
      nome: nomeTrim,
      email: emailTrim,
      cargo: formCargo.trim(),
      perfil_nome: formPerfil,
      perfil_id: formPerfil === 'ADMINISTRADOR' ? 1 : 2,
      senha: senhaTrim || undefined,
      ativo: formAtivo,
      permissoes: formPermissoes,
    });

    if (!resultado.sucesso) {
      setErroForm(resultado.mensagem);
      return;
    }

    dispararFeedback('sucesso', resultado.mensagem);
    setModalAberto(false);
  };

  // Alternar situação direto da tabela
  const handleToggleSituacao = async (usuarioId: string) => {
    const res = await toggleAtivoUsuario(usuarioId);
    if (!res.sucesso) {
      dispararFeedback('erro', res.mensagem);
    } else {
      dispararFeedback('sucesso', res.mensagem);
    }
  };

  // Confirmar exclusão de usuário
  const handleConfirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;
    const res = await excluirUsuario(usuarioParaExcluir.id);
    if (!res.sucesso) {
      dispararFeedback('erro', res.mensagem);
    } else {
      dispararFeedback('sucesso', res.mensagem);
    }
    setUsuarioParaExcluir(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Feedback Local */}
      {avisoLocal && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-semibold shadow-xs animate-fadeIn ${
            avisoLocal.tipo === 'sucesso'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {avisoLocal.tipo === 'sucesso' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{avisoLocal.texto}</span>
        </div>
      )}

      {/* Header da Seção de Gestão de Usuários */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Gerenciamento de Usuários & Permissões
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre novos usuários, controle a situação (ativo/inativo) e configure detalhadamente os módulos acessíveis e operações permitidas (inserir, alterar/editar e excluir).
              </p>
            </div>
          </div>
        </div>

        {podeInserir && (
          <button
            onClick={abrirNovoUsuario}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-[0.98] transition-all shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Cadastrar Novo Usuário
          </button>
        )}
      </div>

      {/* KPIs de Usuários */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Usuários
          </span>
          <p className="mt-1 text-2xl font-black text-slate-900">{metricas.total}</p>
          <span className="text-[10px] text-slate-400">Contas no sistema</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ativos
          </span>
          <p className="mt-1 text-2xl font-black text-emerald-950">{metricas.ativos}</p>
          <span className="text-[10px] text-emerald-700">Com acesso liberado</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Inativos
          </span>
          <p className="mt-1 text-2xl font-black text-slate-700">{metricas.inativos}</p>
          <span className="text-[10px] text-slate-400">Acesso suspenso</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
            Administradores
          </span>
          <p className="mt-1 text-2xl font-black text-purple-950">{metricas.admins}</p>
          <span className="text-[10px] text-slate-400">Gestão & Auditoria</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Vendedores
          </span>
          <p className="mt-1 text-2xl font-black text-blue-950">{metricas.vendedores}</p>
          <span className="text-[10px] text-slate-400">Comercial & Propostas</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>Situação:</span>
          </div>
          <select
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="TODOS">Todas ({usuarios.length})</option>
            <option value="ATIVO">Apenas Ativos ({metricas.ativos})</option>
            <option value="INATIVO">Apenas Inativos ({metricas.inativos})</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold ml-2">
            <span>Perfil:</span>
          </div>
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
          >
            <option value="TODOS">Todos os Perfis</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="VENDEDOR">Vendedor</option>
            <option value="GERENTE">Gerente</option>
            <option value="AUDITOR">Auditor</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Usuário / Cargo</th>
                <th className="px-4 py-3.5">Perfil</th>
                <th className="px-4 py-3.5 text-center">Situação</th>
                <th className="px-4 py-3.5">Módulos & Permissões</th>
                <th className="px-4 py-3.5">Cadastrado em</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold">Nenhum usuário encontrado com os filtros atuais.</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Tente alterar a busca ou limpar os filtros de situação e perfil.
                    </p>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const permissoes = normalizarPermissoesUsuario(u);
                  const modulosComAcesso = permissoes.filter((p) => p.acesso);
                  const isConectado = u.id === usuarioAtual.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !u.ativo ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Usuário e Cargo */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm text-white ${
                              u.perfil_nome === 'ADMINISTRADOR'
                                ? 'bg-purple-600 shadow-2xs'
                                : u.perfil_nome === 'GERENTE'
                                ? 'bg-indigo-600 shadow-2xs'
                                : u.perfil_nome === 'AUDITOR'
                                ? 'bg-amber-600 shadow-2xs'
                                : 'bg-emerald-600 shadow-2xs'
                            }`}
                          >
                            {u.nome
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 truncate">
                                {u.nome}
                              </span>
                              {isConectado && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            {u.cargo && (
                              <p className="text-[10px] font-medium text-slate-400 truncate">
                                {u.cargo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                            u.perfil_nome === 'ADMINISTRADOR'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : u.perfil_nome === 'GERENTE'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : u.perfil_nome === 'AUDITOR'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {u.perfil_nome === 'ADMINISTRADOR' && <Shield className="h-3 w-3" />}
                          {u.perfil_nome === 'VENDEDOR' && <User className="h-3 w-3" />}
                          {u.perfil_nome}
                        </span>
                      </td>

                      {/* Situação (Ativo / Inativo) com Toggle Switch Direto */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={!podeAlterar || (isConectado && u.ativo)}
                            onClick={() => handleToggleSituacao(u.id)}
                            title={
                              isConectado && u.ativo
                                ? 'Você não pode inativar seu próprio usuário em sessão'
                                : u.ativo
                                ? 'Clique para inativar usuário'
                                : 'Clique para ativar usuário'
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              u.ativo ? 'bg-emerald-600' : 'bg-slate-300'
                            } ${
                              (!podeAlterar || (isConectado && u.ativo))
                                ? 'opacity-60 cursor-not-allowed'
                                : 'hover:opacity-90'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                u.ativo ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-bold ${
                              u.ativo ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </td>

                      {/* Módulos & Permissões */}
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-800">
                              {modulosComAcesso.length} de {MODULOS_SISTEMA.length} módulos
                            </span>
                            <button
                              onClick={() => setModalDetalhesUsuario(u)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                            >
                              <Eye className="h-3 w-3" />
                              Ver detalhes
                            </button>
                          </div>

                          {/* Chips dos módulos liberados */}
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {modulosComAcesso.slice(0, 4).map((p) => {
                              const moduloInfo = MODULOS_SISTEMA.find((m) => m.id === p.modulo);
                              return (
                                <span
                                  key={p.modulo}
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200"
                                  title={`${moduloInfo?.nome}: Inserir=${p.inserir ? 'Sim' : 'Não'}, Editar=${p.alterar ? 'Sim' : 'Não'}, Excluir=${p.excluir ? 'Sim' : 'Não'}`}
                                >
                                  {moduloInfo?.nome.split(' ')[0]}
                                  {p.inserir && <span className="text-emerald-600 font-bold">+</span>}
                                  {p.alterar && <span className="text-blue-600 font-bold">✎</span>}
                                  {p.excluir && <span className="text-rose-600 font-bold">✕</span>}
                                </span>
                              );
                            })}
                            {modulosComAcesso.length > 4 && (
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                +{modulosComAcesso.length - 4} mais
                              </span>
                            )}
                            {modulosComAcesso.length === 0 && (
                              <span className="text-[11px] text-slate-400 italic">
                                Nenhum módulo liberado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="px-4 py-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatarDataBR(u.criado_em)}
                      </td>

                      {/* Ações */}
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Incorporar / Atuar como este Usuário (disponível para administradores) */}
                          {(usuarioAtual.perfil_nome === 'ADMINISTRADOR' || adminOriginal !== null) && !isConectado && (
                            <button
                              onClick={async () => {
                                const res = await incorporarUsuario(u.id);
                                if (res.sucesso) {
                                  onFeedback?.('sucesso', res.mensagem);
                                }
                              }}
                              title={`Navegar e agir no sistema como ${u.nome} (${u.perfil_nome})`}
                              className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {podeAlterar && (
                            <button
                              onClick={() => abrirEditarUsuario(u)}
                              title="Editar Usuário e Permissões"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {podeInserir && (
                            <button
                              onClick={() => abrirDuplicarUsuario(u)}
                              title="Duplicar Permissões deste usuário"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}

                          {podeExcluir && !isConectado && (
                            <button
                              onClick={() => setUsuarioParaExcluir(u)}
                              title="Excluir Usuário"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO DE USUÁRIO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                  {usuarioEdicao ? <Edit3 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {usuarioEdicao ? `Editar Usuário: ${usuarioEdicao.nome}` : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina dados de acesso, situação ativa/inativa e permissões por módulo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
                {/* Mensagem de Erro no Formulário */}
                {erroForm && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-900">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{erroForm}</span>
                  </div>
                )}

                {/* SEÇÃO 1: DADOS CADASTRAIS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    1. Dados Cadastrais & Acesso
                  </h4>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Nome Completo */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Nome Completo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: Gabriela Medeiros"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        E-mail de Acesso <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Ex: gabriela.medeiros@empresa.com.br"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Cargo / Função */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Cargo / Função
                      </label>
                      <input
                        type="text"
                        value={formCargo}
                        onChange={(e) => setFormCargo(e.target.value)}
                        placeholder="Ex: Consultor Comercial Sênior"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Perfil Base */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Perfil Base
                      </label>
                      <select
                        value={formPerfil}
                        onChange={(e) => handleTrocarPerfilForm(e.target.value as PerfilTipo)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="VENDEDOR">Vendedor (Comercial)</option>
                        <option value="ADMINISTRADOR">Administrador (Total)</option>
                        <option value="GERENTE">Gerente Comercial</option>
                        <option value="AUDITOR">Auditor (Consulta)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Ao trocar o perfil, as permissões recomendadas abaixo são recarregadas.
                      </p>
                    </div>

                    {/* Senha de Acesso */}
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                          <span>Senha de Acesso</span>
                          {usuarioEdicao ? (
                            <span className="text-[11px] font-normal text-slate-500">
                              (Deixe em branco se não quiser alteração)
                            </span>
                          ) : (
                            <span className="text-[11px] font-normal text-slate-500">
                              (Opcional — padrão inicial:{' '}
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                                123456
                              </span>{' '}
                              se em branco)
                            </span>
                          )}
                        </label>

                        {usuarioEdicao?.senha_atualizada_em && (
                          <span className="text-[10px] text-slate-400">
                            Última atualização: {formatarDataBR(usuarioEdicao.senha_atualizada_em.split('T')[0])}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={mostrarSenha ? 'text' : 'password'}
                          value={formSenha}
                          onChange={(e) => setFormSenha(e.target.value)}
                          placeholder={
                            usuarioEdicao
                              ? '•••••••• (Deixe em branco para manter a senha atual)'
                              : 'Digite a senha de acesso ou deixe em branco para "123456"'
                          }
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-20 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden"
                        />
                        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                          {formSenha && (
                            <button
                              type="button"
                              onClick={() => setFormSenha('')}
                              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Limpar campo de senha"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMostrarSenha(!mostrarSenha)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha digitada'}
                          >
                            {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-500 pt-0.5">
                        <p className="leading-tight">
                          {usuarioEdicao ? (
                            <>
                              <strong className="text-slate-700">Como funciona:</strong> Se desejar manter a senha atual inalterada, deixe este campo vazio. Caso preencha, a nova senha passará a valer imediatamente (mínimo 6 caracteres).
                            </>
                          ) : (
                            <>
                              <strong className="text-slate-700">Como funciona:</strong> Defina uma senha inicial personalizada (mínimo 6 caracteres) ou deixe em branco para atribuir a senha temporária padrão <span className="font-mono font-bold text-slate-700">123456</span>.
                            </>
                          )}
                        </p>
                        {formSenha && (
                          <span
                            className={`shrink-0 font-semibold ${
                              formSenha.length >= 6 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {formSenha.length} caracteres {formSenha.length < 6 ? '(mínimo 6)' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Situação (Ativo / Inativo) */}
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Situação do Usuário: {formAtivo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formAtivo
                          ? 'O usuário pode efetuar login e operar normalmente no sistema.'
                          : 'O usuário terá seu login e acesso bloqueados imediatamente.'}
                      </span>
                    </div>

                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formAtivo}
                        onChange={(e) => setFormAtivo(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-['']"></div>
                    </label>
                  </div>
                </div>

                {/* SEÇÃO 2: MATRIZ DE MÓDULOS E AÇÕES (INSERIR, ALTERAR/EDITAR, EXCLUIR) */}
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                        2. Módulos & Operações Permitidas
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Marque os módulos aos quais terá acesso e defina as operações permitidas: inserir, alterar/editar e excluir.
                      </p>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Presets:</span>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('ADMIN')}
                        className="rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                      >
                        Admin Total
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('VENDEDOR')}
                        className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Vendedor
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('GERENTE')}
                        className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                      >
                        Gerente
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('LEITURA')}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                      >
                        Leitura
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarPreset('LIMPAR')}
                        className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Matriz em Tabela */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-2.5 pl-4 pr-3">Módulo do Sistema</th>
                          <th className="px-3 py-2.5 text-center">Acesso (Visualizar)</th>
                          <th className="px-3 py-2.5 text-center">Inserir</th>
                          <th className="px-3 py-2.5 text-center">Alterar / Editar</th>
                          <th className="px-3 py-2.5 text-center">Excluir</th>
                          <th className="py-2.5 pl-2 pr-4 text-right">Atalho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {MODULOS_SISTEMA.map((modulo) => {
                          const perm = formPermissoes.find((p) => p.modulo === modulo.id) || {
                            modulo: modulo.id,
                            acesso: false,
                            inserir: false,
                            alterar: false,
                            excluir: false,
                          };

                          const temAcesso = perm.acesso;

                          return (
                            <tr
                              key={modulo.id}
                              className={`transition-colors ${
                                temAcesso ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                              }`}
                            >
                              {/* Nome e Descrição do Módulo */}
                              <td className="py-3 pl-4 pr-3">
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">
                                    {modulo.nome}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block line-clamp-1">
                                    {modulo.descricao}
                                  </span>
                                </div>
                              </td>

                              {/* Coluna Acesso (Visualizar) */}
                              <td className="px-3 py-3 text-center">
                                <label className="inline-flex cursor-pointer items-center">
                                  <input
                                    type="checkbox"
                                    checked={perm.acesso}
                                    onChange={(e) =>
                                      atualizarPermissaoModulo(modulo.id, 'acesso', e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                </label>
                              </td>

                              {/* Coluna Inserir */}
                              <td className="px-3 py-3 text-center">
                                {modulo.permiteInserir !== false ? (
                                  <label
                                    className={`inline-flex items-center ${
                                      !temAcesso ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!temAcesso}
                                      checked={perm.inserir && temAcesso}
                                      onChange={(e) =>
                                        atualizarPermissaoModulo(modulo.id, 'inserir', e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                  </label>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">—</span>
                                )}
                              </td>

                              {/* Coluna Alterar / Editar */}
                              <td className="px-3 py-3 text-center">
                                {modulo.permiteAlterar !== false ? (
                                  <label
                                    className={`inline-flex items-center ${
                                      !temAcesso ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!temAcesso}
                                      checked={perm.alterar && temAcesso}
                                      onChange={(e) =>
                                        atualizarPermissaoModulo(modulo.id, 'alterar', e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </label>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">—</span>
                                )}
                              </td>

                              {/* Coluna Excluir */}
                              <td className="px-3 py-3 text-center">
                                {modulo.permiteExcluir !== false ? (
                                  <label
                                    className={`inline-flex items-center ${
                                      !temAcesso ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!temAcesso}
                                      checked={perm.excluir && temAcesso}
                                      onChange={(e) =>
                                        atualizarPermissaoModulo(modulo.id, 'excluir', e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                    />
                                  </label>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">—</span>
                                )}
                              </td>

                              {/* Atalho de Linha */}
                              <td className="py-3 pl-2 pr-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => toggleTodasPermissoesLinha(modulo.id)}
                                  className="text-[10px] font-bold text-slate-500 hover:text-emerald-700 hover:underline"
                                >
                                  {temAcesso ? 'Inverter' : 'Liberar Tudo'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                <div className="text-[11px] text-slate-400">
                  {usuarioEdicao?.criado_em && (
                    <span>Criado em: {formatarDataBR(usuarioEdicao.criado_em)}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 active:scale-[0.98] transition-all"
                  >
                    <Check className="h-4 w-4" />
                    Salvar Usuário
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE INSPEÇÃO DETALHADA DE PERMISSÕES */}
      {modalDetalhesUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Permissões de {modalDetalhesUsuario.nome}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {modalDetalhesUsuario.email} • {modalDetalhesUsuario.perfil_nome} •{' '}
                    <span
                      className={`font-bold ${
                        modalDetalhesUsuario.ativo ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {modalDetalhesUsuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalDetalhesUsuario(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {/* Informações de Credencial & Senha */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Credencial de Acesso
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Senha cadastrada e ativa •{' '}
                      {modalDetalhesUsuario.senha_atualizada_em
                        ? `Última alteração em ${formatarDataBR(modalDetalhesUsuario.senha_atualizada_em.split('T')[0])}`
                        : 'Senha inicial configurada'}
                    </span>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Senha Ativa
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3">Módulo</th>
                      <th className="px-3 py-2.5 text-center">Acesso</th>
                      <th className="px-3 py-2.5 text-center">Inserir</th>
                      <th className="px-3 py-2.5 text-center">Alterar</th>
                      <th className="px-3 py-2.5 text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MODULOS_SISTEMA.map((m) => {
                      const perms = normalizarPermissoesUsuario(modalDetalhesUsuario);
                      const p = perms.find((item) => item.modulo === m.id);
                      const temAcesso = Boolean(p?.acesso);

                      return (
                        <tr
                          key={m.id}
                          className={temAcesso ? 'bg-white' : 'bg-slate-50/60 opacity-60'}
                        >
                          <td className="py-2.5 pl-4 pr-3 font-semibold text-slate-900">
                            {m.nome}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {temAcesso ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                <Check className="h-3 w-3" /> Sim
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400">Não</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {temAcesso && p?.inserir ? (
                              <span className="text-emerald-600 font-bold">Sim</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {temAcesso && p?.alterar ? (
                              <span className="text-blue-600 font-bold">Sim</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {temAcesso && p?.excluir ? (
                              <span className="text-rose-600 font-bold">Sim</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <span className="text-[11px] text-slate-500">
                Cadastrado em: {formatarDataBR(modalDetalhesUsuario.criado_em)}
              </span>
              <div className="flex items-center gap-2">
                {podeAlterar && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalDetalhesUsuario(null);
                      abrirEditarUsuario(modalDetalhesUsuario);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-500 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar Permissões
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalDetalhesUsuario(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {usuarioParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Confirmar Exclusão de Usuário</h3>
                <p className="text-xs text-slate-500">Esta ação é irreversível.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tem certeza que deseja excluir permanentemente a conta de{' '}
              <strong className="text-slate-900">{usuarioParaExcluir.nome}</strong> (
              {usuarioParaExcluir.email})?
            </p>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800">
              <strong>Atenção:</strong> Se o usuário possuir vendas registradas, a exclusão será bloqueada para proteger o histórico fiscal. Nesse caso, você pode simplesmente inativá-lo.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUsuarioParaExcluir(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
