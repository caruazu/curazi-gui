import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MoedaMaskDirective, digitosParaValor, formatarMoedaPtBr } from './moeda-mask.directive';

describe('formatarMoedaPtBr', () => {
  it('formata com separadores brasileiros e duas casas', () => {
    expect(formatarMoedaPtBr(1234.56)).toBe('1.234,56');
    expect(formatarMoedaPtBr(0.05)).toBe('0,05');
    expect(formatarMoedaPtBr(500)).toBe('500,00');
    expect(formatarMoedaPtBr(1000000)).toBe('1.000.000,00');
  });
});

describe('digitosParaValor', () => {
  it('interpreta dígitos como centavos', () => {
    expect(digitosParaValor('123456')).toBe(1234.56);
    expect(digitosParaValor('5')).toBe(0.05);
  });

  it('ignora tudo que não é dígito', () => {
    expect(digitosParaValor('1.234,56')).toBe(1234.56);
    expect(digitosParaValor('R$ 500,00')).toBe(500);
  });

  it('retorna null sem dígitos', () => {
    expect(digitosParaValor('')).toBeNull();
    expect(digitosParaValor('abc')).toBeNull();
  });

  it('limita a quantidade de dígitos para não estourar', () => {
    expect(digitosParaValor('999999999999999')).toBe(99999999.99);
  });
});

@Component({
  imports: [ReactiveFormsModule, MoedaMaskDirective],
  template: '<input appMoedaMask [formControl]="controle" />',
})
class HostComponent {
  readonly controle = new FormControl<number | null>(null);
}

describe('MoedaMaskDirective', () => {
  async function criar() {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    return { fixture, input, controle: fixture.componentInstance.controle };
  }

  function digitar(input: HTMLInputElement, texto: string) {
    input.value = texto;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('formata a digitação e envia o número ao FormControl', async () => {
    const { input, controle } = await criar();

    digitar(input, '123456');
    expect(input.value).toBe('1.234,56');
    expect(controle.value).toBe(1234.56);
  });

  it('reformata conforme dígitos são acrescentados ao texto exibido', async () => {
    const { input, controle } = await criar();

    digitar(input, '1.234,56');
    digitar(input, '1.234,567');
    expect(input.value).toBe('12.345,67');
    expect(controle.value).toBe(12345.67);
  });

  it('campo esvaziado envia null', async () => {
    const { input, controle } = await criar();

    digitar(input, '500');
    digitar(input, '');
    expect(input.value).toBe('');
    expect(controle.value).toBeNull();
  });

  it('writeValue formata valor vindo do FormControl', async () => {
    const { fixture, input, controle } = await criar();

    controle.setValue(500);
    fixture.detectChanges();
    expect(input.value).toBe('500,00');

    controle.setValue(null);
    fixture.detectChanges();
    expect(input.value).toBe('');
  });
});
