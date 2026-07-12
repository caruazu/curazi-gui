import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { SimulacaoResponse } from '../../../core/api/simulacao.models';
import { respostaSimulacaoMock } from '../../../testing/simulacao-response.mock';
import { ResultadosComponent } from './resultados.component';

registerLocaleData(localePt, 'pt-BR');

describe('ResultadosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultadosComponent],
      providers: [
        provideNoopAnimations(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
  });

  function criar(resultado: SimulacaoResponse = respostaSimulacaoMock()) {
    const fixture = TestBed.createComponent(ResultadosComponent);
    fixture.componentRef.setInput('resultado', resultado);
    fixture.detectChanges();
    // CLDR usa espaços não separáveis entre "R$" e o valor.
    const texto = () => (fixture.nativeElement.textContent as string).replace(/[  ]/g, ' ');
    return { fixture, texto };
  }

  it('exibe os seis cards do contrato formatados em pt-BR', () => {
    const { texto } = criar();

    expect(texto()).toContain('Custo de implantação');
    expect(texto()).toContain('R$ 15.400,00');
    expect(texto()).toContain('Economia no 1º ano');
    expect(texto()).toContain('R$ 5.514,00');
    expect(texto()).toContain('4,40 kWp');
    expect(texto()).toContain('8 módulos · 17,3 m²');
    expect(texto()).toContain('531 kWh/mês');
  });

  it('payback descontado em destaque com o simples como linha secundária', () => {
    const { fixture, texto } = criar();

    expect(texto()).toContain('3 anos e 5 meses');
    expect(texto()).toContain('(simples: 2 anos e 10 meses)');
    expect(fixture.nativeElement.querySelector('.cartao__secundario')).not.toBeNull();
  });

  it('não exibe o banner de atendimento parcial quando false', () => {
    const { fixture } = criar();
    expect(fixture.nativeElement.querySelector('.banner-parcial')).toBeNull();
  });

  it('exibe o banner âmbar quando atendimentoParcial é true', () => {
    const { fixture, texto } = criar({ ...respostaSimulacaoMock(), atendimentoParcial: true });

    expect(fixture.nativeElement.querySelector('.banner-parcial[role="status"]')).not.toBeNull();
    expect(texto()).toContain('atende parte do consumo');
  });

  it('rodapé exibe disclaimers, atribuição ao Google com a data da imagem e vigência da tarifa', () => {
    const { texto } = criar();

    expect(texto()).toContain('não substitui visita técnica');
    expect(texto()).toContain('Premissas: bandeira verde');
    expect(texto()).toContain('Análise de telhado: Google Solar API — imagem de 01/08/2024.');
    expect(texto()).toContain('Tarifa vigência mai/2026.');
  });

  it('renderiza o gráfico de fluxo de caixa', () => {
    const { fixture } = criar();
    expect(fixture.nativeElement.querySelector('app-grafico-fluxo-caixa canvas')).not.toBeNull();
  });

  it('botão "Refazer simulação" emite o output refazer', () => {
    const { fixture } = criar();
    let emitido = false;
    fixture.componentInstance.refazer.subscribe(() => (emitido = true));

    const botao = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Refazer simulação'),
    ) as HTMLButtonElement;
    botao.click();

    expect(emitido).toBeTrue();
  });
});
