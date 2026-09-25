'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useCommission } from '@/lib/commission-context';
import { TipoPagamentoEntrada } from '@/lib/types';
import { formatarDataBR } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LinhaImportacao {
  linha: number;
  data: string;           // YYYY-MM-DD
  numero_documento: string;
  cliente_nome: string;
  procedimentos: string;
  email_vendedor: string;
  valor_total_venda: number;
  valor_entrada_valida: number;
  tipo_pagamento_entrada: TipoPagamentoEntrada;
  erros: string[];
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const MEIOS_VALIDOS: TipoPagamentoEntrada[] = [
  'PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA',
  'BOLETO', 'CREDITO_PARCELADO', 'SEM_ENTRADA', 'OUTRO',
];

const COLUNAS_TEMPLATE = [
  'Data da Venda (DD/MM/AAAA)',
  'Nº Documento / Protocolo',
  'Nome do Cliente',
  'Procedimentos',
  'E-mail do Vendedor',
  'Valor Total da Venda (R$)',
  'Valor Entrada (R$)',
  'Meio de Pagamento',
];

const EXEMPLO_ROWS = [
  [
    '10/09/2026', 'DOC-2026-001', 'João da Silva',
    'Harmonização Facial', 'vendedor1@clinica.com',
    15000, 5000, 'PIX',
  ],
  [
    '15/09/2026', 'DOC-2026-002', 'Maria Souza',
    'Implante Dentário', 'vendedor1@clinica.com',
    8000, 1600, 'DEBITO',
  ],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateBR(valor: unknown): string | null {
  if (!valor) return null;
  const str = String(valor).trim();
  // DD/MM/AAAA
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  // AAAA-MM-DD
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return str;
  // Serial do Excel (número inteiro de dias desde 1900-01-01)
  const num = Number(valor);
  if (!isNaN(num) && num > 1000) {
    const d = XLSX.SSF.parse_date_code(num);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  return null;
}

function parseMeioPagamento(valor: unknown): TipoPagamentoEntrada | null {
  const str = String(valor ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (MEIOS_VALIDOS.includes(str as TipoPagamentoEntrada)) return str as TipoPagamentoEntrada;
  const mapa: Record<string, TipoPagamentoEntrada> = {
    'CRÉDITO_À_VISTA': 'CREDITO_AVISTA', 'CREDITO_A_VISTA': 'CREDITO_AVISTA',
    'CRÉDITO_PARCELADO': 'CREDITO_PARCELADO', 'SEM_ENTRADA': 'SEM_ENTRADA',
    'DINHEIRO_EM_ESPÉCIE': 'DINHEIRO', 'CARTÃO_DE_DÉBITO': 'DEBITO',
  };
  return mapa[str] ?? null;
}

// ─── Geração do template Excel ────────────────────────────────────────────────

function gerarTemplateExcel(vendedores: { nome: string; email: string }[]) {
  const wb = XLSX.utils.book_new();

  // Aba principal
  const wsData: unknown[][] = [COLUNAS_TEMPLATE, ...EXEMPLO_ROWS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 36 },
    { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Importação');

  // Aba de referência: Meios de pagamento
  const wsMeios = XLSX.utils.aoa_to_sheet([
    ['Código (usar na coluna H)', 'Descrição', 'Válido como Entrada?'],
    ['PIX', 'PIX Instantâneo', 'SIM'],
    ['DINHEIRO', 'Dinheiro em Espécie', 'SIM'],
    ['DEBITO', 'Cartão de Débito', 'SIM'],
    ['CREDITO_AVISTA', 'Cartão de Crédito à Vista (1x)', 'SIM'],
    ['BOLETO', 'Boleto Bancário', 'NÃO'],
    ['CREDITO_PARCELADO', 'Cartão de Crédito Parcelado (2x+)', 'NÃO'],
    ['SEM_ENTRADA', 'Sem Entrada (100% a Prazo)', 'NÃO'],
    ['OUTRO', 'Outro meio de pagamento', 'NÃO'],
  ]);
  wsMeios['!cols'] = [{ wch: 26 }, { wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsMeios, 'Meios de Pagamento');

  // Aba de referência: Vendedores
  const wsVend = XLSX.utils.aoa_to_sheet([
    ['E-mail (usar na coluna E)', 'Nome do Vendedor'],
    ...vendedores.map((v) => [v.email, v.nome]),
  ]);
  wsVend['!cols'] = [{ wch: 34 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsVend, 'Vendedores');

  XLSX.writeFile(wb, 'layout_importacao_vendas.xlsx');
}

// ─── Parsing do arquivo ───────────────────────────────────────────────────────

function parseArquivoExcel(
  buffer: ArrayBuffer,
  vendedores: { id: string; email: string }[]
): LinhaImportacao[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];

  const linhas: LinhaImportacao[] = [];

  // Pula cabeçalho (linha 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    // Ignora linhas totalmente vazias
    if (row.every((c) => String(c).trim() === '')) continue;

    const erros: string[] = [];

    const dataStr = parseDateBR(row[0]);
    if (!dataStr) erros.push('Data inválida (use DD/MM/AAAA)');

    const numDoc = String(row[1] ?? '').trim();
    if (!numDoc) erros.push('Nº Documento obrigatório');

    const clienteNome = String(row[2] ?? '').trim();
    if (!clienteNome) erros.push('Nome do cliente obrigatório');

    const procedimentos = String(row[3] ?? '').trim();

    const emailVend = String(row[4] ?? '').trim().toLowerCase();
    const vendedor = vendedores.find((v) => v.email.toLowerCase() === emailVend);
    if (!emailVend) erros.push('E-mail do vendedor obrigatório');
    else if (!vendedor) erros.push(`Vendedor não encontrado: ${emailVend}`);

    const valorTotal = Number(String(row[5]).replace(',', '.'));
    if (isNaN(valorTotal) || valorTotal <= 0) erros.push('Valor total inválido');

    const valorEntrada = Number(String(row[6]).replace(',', '.'));
    if (isNaN(valorEntrada) || valorEntrada < 0) erros.push('Valor entrada inválido');

    const meio = parseMeioPagamento(row[7]);
    if (!meio) erros.push(`Meio de pagamento inválido: "${row[7]}" — use os códigos da aba Meios de Pagamento`);

    linhas.push({
      linha: i + 1,
      data: dataStr ?? '',
      numero_documento: numDoc,
      cliente_nome: clienteNome,
      procedimentos,
      email_vendedor: emailVend,
      valor_total_venda: isNaN(valorTotal) ? 0 : valorTotal,
      valor_entrada_valida: isNaN(valorEntrada) ? 0 : valorEntrada,
      tipo_pagamento_entrada: meio ?? 'PIX',
      erros,
    });
  }

  return linhas;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImportSalesModal() {
  const { usuarios, usuarioAtual, importarVendasLote } = useCommission();
  const isAdmin = usuarioAtual.perfil_nome === 'ADMINISTRADOR';
  const vendedores = usuarios.filter((u) => u.perfil_nome === 'VENDEDOR' && u.ativo);

  const inputRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaImportacao[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [processando, setProcessando] = useState(false);

  const linhasValidas = linhas.filter((l) => l.erros.length === 0);
  const linhasComErro = linhas.filter((l) => l.erros.length > 0);
  const temErros = linhasComErro.length > 0;

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs max-w-xl mx-auto mt-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
          <Database className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Administrador</h3>
        <p className="mt-1 text-xs text-slate-500">
          A importação de vendas em lote é restrita ao perfil Administrador.
        </p>
      </div>
    );
  }

  const handleArquivo = (file: File) => {
    setFeedback(null);
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const parsed = parseArquivoExcel(buffer, vendedores);
      if (parsed.length === 0) {
        setFeedback({ tipo: 'erro', msg: 'Nenhuma linha de dados encontrada na planilha.' });
        setLinhas([]);
      } else {
        setLinhas(parsed);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleArquivo(file);
  };

  const handleImportar = async (submeterAprovacao: boolean) => {
    if (linhasValidas.length === 0) return;
    setProcessando(true);

    const payload = linhasValidas.map((linha) => {
      const vendedor = vendedores.find((v) => v.email.toLowerCase() === linha.email_vendedor)!;
      return {
        vendedor_id: vendedor.id,
        numero_documento: linha.numero_documento,
        cliente_nome: linha.cliente_nome,
        procedimentos: linha.procedimentos,
        data_venda: linha.data,
        valor_total_venda: linha.valor_total_venda,
        valor_entrada_valida: linha.valor_entrada_valida,
        tipo_pagamento_entrada: linha.tipo_pagamento_entrada,
      };
    });

    const { inseridas, erros: errosImport } = await importarVendasLote(payload, submeterAprovacao);

    setProcessando(false);
    const acao = submeterAprovacao ? 'submetidas para aprovação' : 'salvas como rascunho';
    if (errosImport.length === 0) {
      setFeedback({ tipo: 'sucesso', msg: `${inseridas} venda(s) importadas e ${acao} com sucesso.` });
      setLinhas([]);
      setNomeArquivo(null);
    } else {
      setFeedback({
        tipo: 'erro',
        msg: `${inseridas} importadas. Erros: ${errosImport.join(' | ')}`,
      });
    }
  };

  const handleLimpar = () => {
    setLinhas([]);
    setNomeArquivo(null);
    setFeedback(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Módulo de Integração em Lote com ERP / PDV
            </h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Importe vendas a partir de uma planilha Excel (.xlsx). Baixe o layout, preencha e carregue o arquivo.
              Escolha entre salvar como <strong>rascunho</strong> ou <strong>submeter diretamente para aprovação</strong>.
            </p>
          </div>
          <button
            onClick={() => gerarTemplateExcel(vendedores)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar Layout (.xlsx)
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-xs font-semibold border ${
          feedback.tipo === 'sucesso'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {feedback.tipo === 'sucesso'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Upload area */}
      {linhas.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Upload className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Arraste o arquivo aqui ou clique para selecionar</p>
            <p className="mt-1 text-xs text-slate-400">Formato aceito: .xlsx — Baixe o layout acima para garantir a estrutura correta</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivo(f); }}
          />
        </div>
      )}

      {/* Preview da planilha carregada */}
      {linhas.length > 0 && (
        <div className="space-y-3">
          {/* Cabeçalho do preview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{nomeArquivo}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {linhas.length} linha(s)
              </span>
              {temErros && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {linhasComErro.length} com erro
                </span>
              )}
              {linhasValidas.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                  {linhasValidas.length} válida(s)
                </span>
              )}
            </div>
            <button
              onClick={handleLimpar}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Limpar
            </button>
          </div>

          {/* Tabela de preview */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Linha</th>
                    <th className="px-3 py-2.5">Data</th>
                    <th className="px-3 py-2.5">Documento</th>
                    <th className="px-3 py-2.5">Cliente / Procedimentos</th>
                    <th className="px-3 py-2.5">Vendedor</th>
                    <th className="px-3 py-2.5 text-right">Valor Total</th>
                    <th className="px-3 py-2.5 text-right">Entrada</th>
                    <th className="px-3 py-2.5">Meio</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((linha) => {
                    const vendedor = vendedores.find((v) => v.email.toLowerCase() === linha.email_vendedor);
                    const valida = linha.erros.length === 0;
                    return (
                      <tr key={linha.linha} className={valida ? 'hover:bg-slate-50/60' : 'bg-rose-50/50'}>
                        <td className="px-3 py-2.5 font-mono text-slate-400">{linha.linha}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {linha.data ? formatarDataBR(linha.data) : <span className="text-rose-500">—</span>}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{linha.numero_documento || <span className="text-rose-500">—</span>}</td>
                        <td className="px-3 py-2.5">
                          <span className="block font-medium text-slate-800">{linha.cliente_nome}</span>
                          {linha.procedimentos && (
                            <span className="block text-[10px] text-emerald-700">{linha.procedimentos}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {vendedor
                            ? <span className="text-slate-700">{vendedor.nome}</span>
                            : <span className="text-rose-500 text-[11px]">{linha.email_vendedor || '—'}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          R$ {linha.valor_total_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700 whitespace-nowrap">
                          R$ {linha.valor_entrada_valida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                            {linha.tipo_pagamento_entrada}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {valida ? (
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> OK
                            </span>
                          ) : (
                            <div className="flex items-start gap-1">
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                              <span className="text-rose-600 leading-tight">{linha.erros.join('; ')}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aviso de linhas com erro */}
          {temErros && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                <strong>{linhasComErro.length} linha(s) com erro</strong> serão ignoradas na importação.
                {linhasValidas.length > 0
                  ? ` Apenas as ${linhasValidas.length} linha(s) válidas serão processadas.`
                  : ' Corrija a planilha e carregue novamente.'}
              </span>
            </div>
          )}

          {/* Botões de ação */}
          {linhasValidas.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                disabled={processando}
                onClick={() => handleImportar(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                Importar {linhasValidas.length} venda(s) como Rascunho
              </button>
              <button
                disabled={processando}
                onClick={() => handleImportar(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Importar {linhasValidas.length} venda(s) e Submeter para Aprovação
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
