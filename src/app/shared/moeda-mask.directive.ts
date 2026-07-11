import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const FORMATADOR_PT_BR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Limite de dígitos aceitos (R$ 99.999.999,99) — os validators do campo cuidam
// da faixa de negócio; isto só evita overflow numérico ao digitar.
const MAXIMO_DIGITOS = 10;

/** Formata um número como moeda pt-BR sem símbolo: 1234.56 → "1.234,56". */
export function formatarMoedaPtBr(valor: number): string {
  return FORMATADOR_PT_BR.format(valor);
}

/**
 * Interpreta o texto digitado como centavos: os dígitos entram pela direita
 * ("123456" → 1234.56). Texto sem dígitos → null.
 */
export function digitosParaValor(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '').slice(0, MAXIMO_DIGITOS);
  if (!digitos) {
    return null;
  }
  return Number(digitos) / 100;
}

/**
 * Máscara monetária pt-BR para inputs: digitação livre de dígitos, exibição
 * "1.234,56". O FormControl associado recebe o valor numérico (ou null).
 */
@Directive({
  selector: 'input[appMoedaMask]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoedaMaskDirective),
      multi: true,
    },
  ],
  host: {
    inputmode: 'numeric',
    '(input)': 'aoDigitar()',
    '(blur)': 'aoSair()',
  },
})
export class MoedaMaskDirective implements ControlValueAccessor {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  private propagarValor: (valor: number | null) => void = () => {};
  private propagarToque: () => void = () => {};

  aoDigitar(): void {
    const valor = digitosParaValor(this.input.value);
    this.input.value = valor === null ? '' : formatarMoedaPtBr(valor);
    this.propagarValor(valor);
  }

  aoSair(): void {
    this.propagarToque();
  }

  writeValue(valor: number | null): void {
    this.input.value = valor === null || valor === undefined ? '' : formatarMoedaPtBr(valor);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.propagarValor = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagarToque = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.input.disabled = desabilitado;
  }
}
