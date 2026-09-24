'use client';

import React, { useRef, useId } from 'react';
import { formatNumberToBRL, parsePastedCurrency } from '@/lib/currency-utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | '' | null | undefined;
  onChange: (value: number) => void;
  showPrefix?: boolean;
  prefixText?: string;
  wrapperClassName?: string;
}

/**
 * CurrencyInput - Componente de inserção e edição monetária (BRL)
 * - Separação de milhar com '.' (ponto) e centavos com ',' (vírgula)
 * - Composição automática de centavos da direita para a esquerda:
 *   Exemplo: digitar 323077 produz 3.230,77 sem necessidade de digitar vírgula.
 * - Suporte a edição, backspace, colagem (Ctrl+V) e auto-seleção ao focar.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      showPrefix = true,
      prefixText = 'R$',
      className = '',
      wrapperClassName = '',
      disabled = false,
      placeholder = '0,00',
      onFocus,
      ...restProps
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (forwardedRef as React.RefObject<HTMLInputElement>) || internalRef;
    const autoId = useId();
    const inputId = restProps.id || autoId;

    const numericValue = typeof value === 'number' ? value : value === '' ? 0 : Number(value) || 0;
    const displayValue = formatNumberToBRL(numericValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extrai apenas dígitos numéricos
      const rawDigits = e.target.value.replace(/\D/g, '');
      const cents = parseInt(rawDigits, 10);
      const newNumeric = isNaN(cents) ? 0 : cents / 100;

      onChange(newNumeric);

      // Garante que o cursor permaneça no final após a reformatação
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Se pressionar Backspace e o valor for zero, previne comportamento estranho
      if (e.key === 'Backspace' && numericValue === 0) {
        e.preventDefault();
        onChange(0);
        return;
      }
      restProps.onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const parsed = parsePastedCurrency(pasted);
      onChange(parsed);

      requestAnimationFrame(() => {
        if (inputRef.current) {
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      });
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Seleciona o conteúdo ao focar para facilitar sobrescrita rápida
      e.target.select();
      onFocus?.(e);
    };

    return (
      <div className={`relative ${wrapperClassName}`}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={handleFocus}
          className={`w-full rounded-lg border border-slate-300 bg-white ${
            showPrefix ? 'pl-8' : 'px-3'
          } pr-3 py-2 text-xs font-bold text-slate-900 shadow-2xs transition-colors focus:border-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
          {...restProps}
        />
        {showPrefix && (
          <span className="pointer-events-none absolute left-3 top-2 text-xs font-bold text-slate-400">
            {prefixText}
          </span>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
