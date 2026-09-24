/**
 * Utilitários para formatação e manipulação de valores monetários no padrão brasileiro (BRL).
 * Separação de milhar com '.' (ponto) e centavos com ',' (vírgula).
 * Composição direta de centavos ao digitar dígitos (ex: 323077 -> 3.230,77).
 */

export function formatCentsToBRL(cents: number): string {
  if (isNaN(cents) || cents < 0) return '0,00';
  const integerPart = Math.floor(cents / 100);
  const remainder = cents % 100;
  const formattedInteger = integerPart.toLocaleString('pt-BR');
  const formattedCents = remainder.toString().padStart(2, '0');
  return `${formattedInteger},${formattedCents}`;
}

export function formatNumberToBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  const cents = Math.round(Math.abs(value) * 100);
  const formatted = formatCentsToBRL(cents);
  return value < 0 ? `-${formatted}` : formatted;
}

export function parseRawDigitsToNumber(digits: string): number {
  const onlyDigits = digits.replace(/\D/g, '');
  if (!onlyDigits) return 0;
  // Limita a 12 dígitos para evitar overflow numérico
  const truncatedDigits = onlyDigits.slice(0, 12);
  const cents = parseInt(truncatedDigits, 10);
  return isNaN(cents) ? 0 : cents / 100;
}

export function parsePastedCurrency(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Formato brasileiro padrão: "3.230,77" ou "3230,77"
  if (trimmed.includes(',')) {
    const clean = trimmed.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  // Formato com ponto decimal com 1 ou 2 dígitos (ex: "3230.77")
  if (/^\d+(\.\d{1,2})?$/.test(trimmed) && trimmed.includes('.')) {
    const val = parseFloat(trimmed);
    return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  // Sequência direta de dígitos (ex: "323077" -> 3230.77)
  const onlyDigits = trimmed.replace(/\D/g, '');
  if (!onlyDigits) return 0;
  return parseRawDigitsToNumber(onlyDigits);
}
