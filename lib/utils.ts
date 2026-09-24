import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata datas no padrão brasileiro especificado: dd-mm-aaaa
 * Suporta formatos YYYY-MM-DD, ISO string completa ou objeto Date sem desvio de timezone.
 */
export function formatarDataBR(data?: string | Date | null): string {
  if (!data) return '-';
  try {
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (!trimmed) return '-';

      // Se for formato YYYY-MM-DD (comum em inputs de data e bancos)
      const datePart = trimmed.split('T')[0];
      const matchISO = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchISO) {
        const [, ano, mes, dia] = matchISO;
        return `${dia}-${mes}-${ano}`;
      }

      // Se já estiver em dd-mm-aaaa ou dd/mm/aaaa
      const matchBR = datePart.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
      if (matchBR) {
        const [, dia, mes, ano] = matchBR;
        return `${dia}-${mes}-${ano}`;
      }

      // Se for ISO completo com hora, tenta parsear localmente
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}-${mes}-${ano}`;
      }
      return trimmed;
    } else if (data instanceof Date && !isNaN(data.getTime())) {
      const dia = String(data.getDate()).padStart(2, '0');
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = data.getFullYear();
      return `${dia}-${mes}-${ano}`;
    }
  } catch {
    return String(data);
  }
  return String(data);
}

/**
 * Formata data e hora no padrão brasileiro: dd-mm-aaaa HH:mm:ss ou dd-mm-aaaa às HH:mm
 */
export function formatarDataHoraBR(
  data?: string | Date | null,
  incluirSegundos: boolean = false
): string {
  if (!data) return '-';
  try {
    const d = typeof data === 'string' ? new Date(data) : data;
    if (d && !isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const horas = String(d.getHours()).padStart(2, '0');
      const minutos = String(d.getMinutes()).padStart(2, '0');
      if (incluirSegundos) {
        const segundos = String(d.getSeconds()).padStart(2, '0');
        return `${dia}-${mes}-${ano} ${horas}:${minutos}:${segundos}`;
      }
      return `${dia}-${mes}-${ano} às ${horas}:${minutos}`;
    }
  } catch {
    return formatarDataBR(data);
  }
  return formatarDataBR(data);
}

/**
 * Formata um valor numérico para moeda brasileira com separador de milhar '.' e centavos ','
 * Exemplo: 3230.77 -> "3.230,77"
 */
export function formatarMoedaBR(valor?: number | null, incluirPrefixo: boolean = false): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return incluirPrefixo ? 'R$ 0,00' : '0,00';
  }
  const formatado = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return incluirPrefixo ? `R$ ${formatado}` : formatado;
}
