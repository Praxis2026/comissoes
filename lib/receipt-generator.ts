import { LancamentoComissao, Repasse, Usuario, Venda } from '@/lib/types';
import { formatarDataBR, formatarMoedaBR } from '@/lib/utils';

interface DadosRecibo {
  repasse: Repasse;
  vendedor: Usuario | null;
  vendasDoRepasse: Array<{
    venda: Venda;
    lancamento: LancamentoComissao;
  }>;
  nomeEmpresa?: string;
  logoUrl?: string | null;
}

/**
 * Gera o documento HTML completo e autônomo do Recibo de Repasse
 * O documento inclui folha de estilos embutida, regras @page para A4,
 * cabeçalho oficial, demonstrativo analítico, quitação jurídica e campos de assinatura.
 */
export function gerarHtmlRecibo({
  repasse,
  vendedor,
  vendasDoRepasse,
  nomeEmpresa = 'Praxis Comissionamentos',
  logoUrl = null,
}: DadosRecibo): string {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const totalVendido = vendasDoRepasse.reduce(
    (acc, curr) => acc + curr.venda.valor_total_venda,
    0
  );
  const totalEntrada = vendasDoRepasse.reduce(
    (acc, curr) => acc + curr.venda.valor_entrada_valida,
    0
  );
  const totalComissao = repasse.valor_total_repassado;

  const linhasVendas = vendasDoRepasse
    .map(({ venda, lancamento }) => {
      const codigo = venda.codigo_venda || `#${String(venda.numero_sequencial || '').padStart(4, '0')}`;
      const aliquotaOuFixo =
        lancamento.tipo_regra_aplicada === 'VALOR_FIXO'
          ? `${formatarMoedaBR(lancamento.aliquota_ou_fixo_aplicado, true)} (Fixo)`
          : `${lancamento.aliquota_ou_fixo_aplicado.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%`;

      return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: 600;">
            ${codigo} <br/><span style="color: #64748b; font-size: 10px;">${venda.numero_documento}</span>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">
            ${formatarDataBR(venda.data_venda)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <strong>${venda.cliente_nome}</strong>
            ${venda.procedimentos ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">${venda.procedimentos}</div>` : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; white-space: nowrap;">
            ${formatarMoedaBR(venda.valor_total_venda, true)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; white-space: nowrap;">
            ${formatarMoedaBR(venda.valor_entrada_valida, true)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px; white-space: nowrap;">
            ${lancamento.percentual_entrada_calculado.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}%
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; white-space: nowrap;">
            ${aliquotaOuFixo}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #047857; font-size: 11px; white-space: nowrap;">
            R$ ${lancamento.valor_comissao_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo_Repasse_${repasse.id}_${(vendedor?.nome || 'Vendedor').replace(/\s+/g, '_')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.4;
    }
    .document-container {
      max-width: 820px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 30px;
      background: #ffffff;
      border-radius: 8px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .company-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .document-subtitle {
      font-size: 11px;
      color: #475569;
      margin: 0;
    }
    .batch-badge {
      text-align: right;
    }
    .batch-number {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .info-grid td {
      padding: 12px 16px;
      vertical-align: top;
      width: 50%;
    }
    .info-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .info-value-bold {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .info-text {
      font-size: 11px;
      color: #334155;
      margin: 2px 0;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      margin: 18px 0 8px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
    }
    .items-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 8px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    .totals-box {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0 20px 0;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
    }
    .totals-box td {
      padding: 14px 18px;
    }
    .total-highlight {
      font-size: 22px;
      font-weight: 900;
      color: #047857;
      margin: 0;
    }
    .notes-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 11px;
      color: #334155;
    }
    .legal-text {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.5;
      text-align: justify;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      margin-top: 18px;
    }
    .signatures-table {
      width: 100%;
      margin-top: 45px;
      border-collapse: collapse;
    }
    .signatures-table td {
      width: 50%;
      text-align: center;
      vertical-align: top;
      padding: 0 25px;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 6px;
      padding-top: 8px;
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
    }
    .signature-sub {
      font-size: 10px;
      color: #64748b;
    }
    .footer-stamp {
      margin-top: 30px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 10px;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    .action-bar-screen {
      max-width: 820px;
      margin: 0 auto 15px auto;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-action {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-action:hover {
      background: #1e293b;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .action-bar-screen {
        display: none !important;
      }
      .document-container {
        border: none;
        padding: 0;
        max-width: 100%;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar-screen">
    <button onclick="window.print()" class="btn-action">
      🖨️ Imprimir / Salvar como PDF
    </button>
  </div>

  <div class="document-container">
    <!-- Cabeçalho Oficial -->
    <table class="header-table">
      <tr>
        <td>
          ${
            logoUrl
              ? `<img src="${logoUrl}" alt="${nomeEmpresa}" style="max-height: 48px; max-width: 180px; margin-bottom: 6px; object-fit: contain;" /><br/>`
              : ''
          }
          <h1 class="company-title">${nomeEmpresa}</h1>
          <p class="document-subtitle">
            Recibo de Repasse de Comissão Comercial e Quitação Financeira
          </p>
        </td>
        <td class="batch-badge">
          <div class="info-label">Lote de Repasse</div>
          <div class="batch-number">#${repasse.id}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
            Data: <strong>${formatarDataBR(repasse.data_repasse)}</strong>
          </div>
        </td>
      </tr>
    </table>

    <!-- Grid de Informações: Beneficiário e Liquidação -->
    <table class="info-grid">
      <tr>
        <td style="border-right: 1px solid #e2e8f0;">
          <div class="info-label">Beneficiário / Vendedor</div>
          <div class="info-value-bold">${vendedor?.nome || 'Vendedor Não Identificado'}</div>
          <div class="info-text">E-mail: <strong>${vendedor?.email || 'N/A'}</strong></div>
          <div class="info-text">Cargo / Função: <strong>${vendedor?.cargo || vendedor?.perfil_nome || 'Consultor Comercial'}</strong></div>
          <div class="info-text" style="font-size: 10px; color: #64748b;">ID Beneficiário: ${repasse.vendedor_id}</div>
        </td>
        <td>
          <div class="info-label">Dados da Liquidação Financeira</div>
          <div class="info-value-bold" style="color: #047857;">Status: LIQUIDADO / PAGO</div>
          <div class="info-text">Comprovante / Autenticação: <strong>${repasse.comprovante_transacao || 'Não informado'}</strong></div>
          <div class="info-text">Total de Vendas no Lote: <strong>${vendasDoRepasse.length} contrato(s)</strong></div>
          <div class="info-text">Data do Lote: <strong>${formatarDataBR(repasse.data_repasse)}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Tabela Discriminativa de Vendas -->
    <div class="section-title">Demonstrativo Analítico de Vendas Quitadas</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left;">Nº Venda / Doc</th>
          <th style="text-align: left;">Data</th>
          <th style="text-align: left;">Cliente / Procedimento</th>
          <th style="text-align: right;">Total Venda</th>
          <th style="text-align: right;">Entrada Válida</th>
          <th style="text-align: center;">% Entrada</th>
          <th style="text-align: right;">Alíquota/Fixo</th>
          <th style="text-align: right;">Comissão Líquida</th>
        </tr>
      </thead>
      <tbody>
        ${linhasVendas}
      </tbody>
    </table>

    <!-- Quadro de Totais -->
    <table class="totals-box">
      <tr>
        <td>
          <div class="info-label" style="color: #065f46;">Volume Total Vendido no Lote:</div>
          <div style="font-size: 14px; font-weight: 700; color: #1e293b;">
            R$ ${totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div style="font-size: 10px; color: #047857; margin-top: 2px;">
            Volume Entradas Validadas: R$ ${totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </td>
        <td style="text-align: right;">
          <div class="info-label" style="color: #065f46;">Valor Líquido Repassado e Quitado:</div>
          <div class="total-highlight">
            R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </td>
      </tr>
    </table>

    <!-- Observações Financeiras se houver -->
    ${
      repasse.observacoes
        ? `<div class="notes-box">
             <strong>Observações do Repasse Financeiro:</strong><br/>
             ${repasse.observacoes}
           </div>`
        : ''
    }

    <!-- Termo Legal de Quitação -->
    <div class="legal-text">
      Pelo presente instrumento particular de quitação de comissões, o beneficiário acima qualificado
      declara ter conferido minuciosamente o demonstrativo das vendas elencadas neste lote e confirma
      o recebimento integral e irrevogável da quantia líquida de 
      <strong>R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>, 
      apurada segundo as regras de comissionamento vigentes para os respectivos períodos contratuais,
      dando plena, geral e irrevogável quitação de todos os valores e direitos decorrentes deste lote de repasse.
    </div>

    <!-- Campos de Assinatura -->
    <table class="signatures-table">
      <tr>
        <td>
          <div class="signature-line">${vendedor?.nome || 'Beneficiário / Vendedor'}</div>
          <div class="signature-sub">Assinatura do Vendedor / Beneficiário</div>
          <div class="signature-sub">Data: ____/____/________</div>
        </td>
        <td>
          <div class="signature-line">Controladoria & Tesouraria</div>
          <div class="signature-sub">${nomeEmpresa} — Departamento Financeiro</div>
          <div class="signature-sub">Data da Quitação: ${formatarDataBR(repasse.data_repasse)}</div>
        </td>
      </tr>
    </table>

    <!-- Rodapé de Autenticidade -->
    <div class="footer-stamp">
      Documento emitido eletronicamente em ${dataHoje} às ${horaHoje} | Sistema ${nomeEmpresa} | Autenticidade Lote: REP-${repasse.id}-${repasse.vendedor_id.slice(0, 8)}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispara a impressão imediata do recibo via iframe oculto.
 * Se houver restrições de sandbox ou iframe do navegador,
 * recorre com segurança ao salvamento / download direto do arquivo HTML formatado.
 */
export function imprimirOuSalvarRecibo(
  dados: DadosRecibo,
  onFeedback?: (mensagem: string, tipo: 'info' | 'sucesso' | 'aviso') => void
): void {
  const htmlContent = gerarHtmlRecibo(dados);
  const nomeArquivo = `Recibo_Repasse_${dados.repasse.id}_${(dados.vendedor?.nome || 'Vendedor')
    .replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;

  let frameImpresso = false;

  try {
    // 1. Cria um iframe invisível para executar a impressão de forma isolada
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'Frame de Impressão de Recibo');

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            frameImpresso = true;
            onFeedback?.('Janela de impressão/PDF aberta com sucesso!', 'sucesso');
          }
        } catch (err) {
          console.warn('Impressão em iframe interceptada pelo navegador:', err);
        }

        // Se o print do iframe não abriu por restrição de ambiente/sandbox,
        // realiza o download automático do documento pronto para impressão
        if (!frameImpresso) {
          baixarArquivoRecibo(htmlContent, nomeArquivo);
          onFeedback?.(
            'Recibo gerado e baixado para o seu computador! Você pode abri-lo e imprimir/salvar em PDF.',
            'sucesso'
          );
        }

        // Remove o iframe temporário após alguns segundos
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {}
        }, 4000);
      }, 350);

      return;
    }
  } catch (e) {
    console.warn('Erro ao criar iframe de impressão:', e);
  }

  // Fallback garantido caso a manipulação de DOM falhe
  baixarArquivoRecibo(htmlContent, nomeArquivo);
  onFeedback?.(
    'Recibo pronto! O arquivo oficial foi baixado para seu computador para impressão ou envio.',
    'sucesso'
  );
}

/**
 * Realiza o download direto do arquivo HTML do recibo para armazenamento local ou impressão externa
 */
export function baixarArquivoRecibo(htmlContent: string, nomeArquivo: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}
