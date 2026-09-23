'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react';
import { useCommission } from '@/lib/commission-context';
import {
  Building2,
  UploadCloud,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Eye,
  LogOut,
  Trash2,
  Link as LinkIcon,
  ShieldCheck,
  Info,
  HelpCircle,
} from 'lucide-react';

interface BrandingSettingsProps {
  onFeedback?: (tipo: 'sucesso' | 'erro', texto: string) => void;
}

// Exemplos de logotipos vetoriais prontos para teste rápido
const LOGOS_PREDEFINIDOS = [
  {
    nome: 'Clínica Saúde & Estética',
    categoria: 'Saúde / Harmonização',
    // SVG em data URL de cruz médica estilizada com folha verde
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect width="200" height="60" rx="10" fill="%23064e3b"/><circle cx="32" cy="30" r="18" fill="%2310b981"/><path d="M32 20v20M22 30h20" stroke="%23ffffff" stroke-width="4" stroke-linecap="round"/><text x="62" y="28" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="16">CLÍNICA SAÚDE</text><text x="62" y="44" fill="%23a7f3d0" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="1">ESTÉTICA & HARMONIZAÇÃO</text></svg>',
  },
  {
    nome: 'Dental Premium Pro',
    categoria: 'Odontologia / Implantes',
    // SVG em data URL de dente moderno com gradiente azul
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect width="200" height="60" rx="10" fill="%230f172a"/><path d="M22 25c0-6 4-11 10-11s10 5 10 11c0 6-3 15-5 21-2 5-3 5-5 0-2-5-5-15-5-21z" fill="%230ea5e9"/><text x="56" y="28" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="16">DENTAL PRO</text><text x="56" y="44" fill="%2338bdf8" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="1">IMPLANTES & ODONTO</text></svg>',
  },
  {
    nome: 'Capital Finance Comissões',
    categoria: 'Financeiro / Holding',
    // SVG em data URL de gráfico ascendente dourado
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect width="200" height="60" rx="10" fill="%2318181b"/><circle cx="32" cy="30" r="18" fill="%23f59e0b"/><path d="M22 36l7-8 6 5 9-11" stroke="%23ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="60" y="28" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="16">CAPITAL FINANCE</text><text x="60" y="44" fill="%23fcd34d" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="1">HOLDING & GESTÃO</text></svg>',
  },
  {
    nome: 'Apex Tech Solutions',
    categoria: 'Tecnologia / Inovação',
    // SVG em data URL de losango roxo moderno
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect width="200" height="60" rx="10" fill="%231e1b4b"/><rect x="22" y="20" width="20" height="20" rx="4" transform="rotate(45 32 30)" fill="%238b5cf6"/><text x="58" y="28" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="16">APEX TECH</text><text x="58" y="44" fill="%23c4b5fd" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="1">SOLUTIONS & COMMERCE</text></svg>',
  },
];

export function BrandingSettings({ onFeedback }: BrandingSettingsProps) {
  const {
    logoEmpresa,
    salvarLogoEmpresa,
    nomeEmpresa,
    salvarNomeEmpresa,
    usuarioAtual,
    logout,
  } = useCommission();

  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';

  // Local state for draft editing
  const [logoDraft, setLogoDraft] = useState<string | null>(logoEmpresa);
  const [nomeDraft, setNomeDraft] = useState<string>(nomeEmpresa || 'Comissões Pro');
  const [urlInput, setUrlInput] = useState<string>('');
  const [nomeArquivoCarregado, setNomeArquivoCarregado] = useState<string | null>(null);
  const [tamanhoArquivo, setTamanhoArquivo] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processarArquivoImagem = (file: File) => {
    // Validar tipo de imagem
    if (!file.type.startsWith('image/')) {
      if (onFeedback) {
        onFeedback('erro', 'O arquivo selecionado não é uma imagem válida (PNG, JPG, SVG, WebP).');
      }
      return;
    }

    // Limite de 3MB
    if (file.size > 3 * 1024 * 1024) {
      if (onFeedback) {
        onFeedback('erro', 'A imagem excede o tamanho máximo de 3MB.');
      }
      return;
    }

    setNomeArquivoCarregado(file.name);
    setTamanhoArquivo(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLogoDraft(result);
        if (onFeedback) {
          onFeedback('sucesso', `Imagem "${file.name}" carregada no editor.`);
        }
      }
    };
    reader.onerror = () => {
      if (onFeedback) {
        onFeedback('erro', 'Falha ao processar o arquivo de imagem.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processarArquivoImagem(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = () => {
    setArrastando(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processarArquivoImagem(file);
    }
  };

  const handleCarregarUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      if (onFeedback) {
        onFeedback('erro', 'Informe uma URL válida (iniciando com https:// ou data:image).');
      }
      return;
    }

    setLogoDraft(url);
    setNomeArquivoCarregado('Logotipo via URL externa');
    setTamanhoArquivo(null);
    setUrlInput('');
    if (onFeedback) {
      onFeedback('sucesso', 'URL da imagem carregada para pré-visualização.');
    }
  };

  const handleSelecionarPreset = (preset: (typeof LOGOS_PREDEFINIDOS)[0]) => {
    setLogoDraft(preset.url);
    setNomeDraft(preset.nome);
    setNomeArquivoCarregado(`Modelo: ${preset.nome}`);
    setTamanhoArquivo('Vetor SVG');
    if (onFeedback) {
      onFeedback('sucesso', `Modelo predefinido "${preset.nome}" selecionado.`);
    }
  };

  const handleSalvarTudo = () => {
    if (!isAdmin) {
      if (onFeedback) {
        onFeedback('erro', 'Apenas usuários com perfil Administrador podem alterar o logotipo.');
      }
      return;
    }

    const resLogo = salvarLogoEmpresa(logoDraft);
    salvarNomeEmpresa(nomeDraft);

    if (onFeedback) {
      onFeedback(
        'sucesso',
        'Identidade visual e logotipo atualizados! As alterações já estão ativas na tela de login e em todo o sistema.'
      );
    }
  };

  const handleRestaurarPadrao = () => {
    if (!isAdmin) return;
    if (window.confirm('Deseja remover o logotipo personalizado e voltar ao padrão nativo do sistema?')) {
      setLogoDraft(null);
      setNomeDraft('Comissões Pro');
      setNomeArquivoCarregado(null);
      setTamanhoArquivo(null);
      salvarLogoEmpresa(null);
      salvarNomeEmpresa('Comissões Pro');
      if (onFeedback) {
        onFeedback('sucesso', 'Logotipo padrão do sistema restaurado com sucesso.');
      }
    }
  };

  const handleTestarTelaLogin = () => {
    if (logoDraft !== logoEmpresa) {
      salvarLogoEmpresa(logoDraft);
      salvarNomeEmpresa(nomeDraft);
    }
    logout();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Identidade Visual & Logotipo do Sistema
                </h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 border border-emerald-200">
                  Tela de Login & Header
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                Insira o logotipo oficial da sua clínica ou empresa para personalizar a tela de login
                moderna, o topo do menu lateral e o cabeçalho. As alterações são sincronizadas
                automaticamente em todo o aplicativo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTestarTelaLogin}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
              title="Faz logout e abre a tela de login moderna com o logotipo atualizado"
            >
              <LogOut className="h-4 w-4 text-emerald-400" />
              <span>Testar Tela de Login (Sair)</span>
            </button>

            {logoDraft && isAdmin && (
              <button
                onClick={handleRestaurarPadrao}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remover Logo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Upload & Configuration Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Card 1: Nome da Empresa */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Nome da Empresa ou Clínica
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Este nome será exibido na tela de login abaixo do logotipo e nos títulos dos relatórios.
            </p>
            <div>
              <input
                type="text"
                value={nomeDraft}
                onChange={(e) => setNomeDraft(e.target.value)}
                placeholder="Ex: Clínica Alpha Saúde & Estética"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Card 2: Upload de Arquivo Local */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Inserir Arquivo de Logotipo
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">PNG, JPG, SVG, WebP (até 3MB)</span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                arrastando
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : 'border-slate-300 bg-slate-50/70 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-xs border border-slate-200 mb-3">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Clique para selecionar ou arraste sua logo aqui
              </div>
              <p className="mt-1 text-[11px] text-slate-500 max-w-xs">
                Formatos recomendados: PNG transparente ou SVG vetorial com largura horizontal (ex: 240x60px).
              </p>

              {nomeArquivoCarregado && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{nomeArquivoCarregado}</span>
                  {tamanhoArquivo && <span className="text-[10px] text-emerald-600">({tamanhoArquivo})</span>}
                </div>
              )}
            </div>

            {/* Alternativa: URL Externa */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ou insira uma URL direta de imagem:
              </label>
              <form onSubmit={handleCarregarUrl} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <LinkIcon className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://suaempresa.com.br/logo.png"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Carregar URL
                </button>
              </form>
            </div>
          </div>

          {/* Card 3: Modelos Prontos para Teste Rápido */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-800">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Modelos Prontos de Logotipo (1 Clique)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Para validação rápida</span>
            </div>
            <p className="text-xs text-slate-500">
              Se preferir não fazer upload no momento, escolha um dos logotipos profissionais abaixo para testar instantaneamente na tela de login:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {LOGOS_PREDEFINIDOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelecionarPreset(preset)}
                  className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group cursor-pointer"
                >
                  <div className="mb-2 w-full rounded-lg bg-slate-900 p-2 flex items-center justify-center">
                    <img
                      src={preset.url}
                      alt={preset.nome}
                      className="max-h-8 max-w-full object-contain"
                    />
                  </div>
                  <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700">
                    {preset.nome}
                  </div>
                  <div className="text-[10px] text-slate-500">{preset.categoria}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Salvar Button Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSalvarTudo}
              disabled={!isAdmin}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Salvar Logotipo e Configurações</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Previews (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pré-visualização em Tempo Real
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Ao Vivo
              </span>
            </div>

            {/* Preview 1: Modern Login Card Replica */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>1. Como ficará na Tela de Login:</span>
                <span className="text-[10px] font-normal text-slate-400">Card Escuro Glassmorphism</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center shadow-xl">
                {/* Logo Area */}
                <div className="mx-auto mb-3 flex items-center justify-center">
                  {logoDraft ? (
                    <div className="flex max-h-16 max-w-[200px] items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/60 p-2.5 shadow-inner">
                      <img
                        src={logoDraft}
                        alt="Logo Preview"
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="text-sm font-black text-white">
                  {nomeDraft || 'Comissões Pro'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Portal Seguro de Comissionamento & Governança
                </div>

                {/* Dummy Input Fields */}
                <div className="mt-4 space-y-2 text-left">
                  <div className="h-7 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 flex items-center text-[10px] text-slate-500">
                    ex: carlos.mendes@empresa.com.br
                  </div>
                  <div className="h-7 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 flex items-center text-[10px] text-slate-500">
                    ••••••••••••
                  </div>
                  <div className="h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                    Entrar no Sistema →
                  </div>
                </div>
              </div>
            </div>

            {/* Preview 2: Lateral Menu / Sidebar Header Replica */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>2. Como ficará no Menu Lateral:</span>
                <span className="text-[10px] font-normal text-slate-400">Sidebar Slate-900</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 flex items-center gap-3">
                {logoDraft ? (
                  <div className="flex h-10 max-w-[130px] items-center justify-center rounded-lg bg-slate-950 p-1 border border-slate-800">
                    <img
                      src={logoDraft}
                      alt="Sidebar Logo"
                      className="max-h-8 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-black text-white truncate">
                    {nomeDraft || 'Comissões Pro'}
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                    Motor Relacional 1.1
                  </div>
                </div>
              </div>
            </div>

            {/* Preview 3: Top Navigation Header Replica */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>3. Como ficará no Cabeçalho Superior:</span>
                <span className="text-[10px] font-normal text-slate-400">Header Claro</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {logoDraft ? (
                    <div className="flex h-7 max-w-[90px] items-center">
                      <img
                        src={logoDraft}
                        alt="Header Logo"
                        className="max-h-6 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {nomeDraft || 'Comissões Pro'}
                  </span>
                </div>
                <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                  Online
                </div>
              </div>
            </div>

            {/* Direct CTA to Test Login */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-center space-y-2">
              <div className="text-xs font-bold text-slate-800">
                Quer ver a tela de login ao vivo?
              </div>
              <p className="text-[11px] text-slate-500">
                Ao clicar abaixo, sua sessão atual será encerrada para visualizar a tela de login moderna com o novo logotipo.
              </p>
              <button
                onClick={handleTestarTelaLogin}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Salvar e Ir para a Tela de Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
