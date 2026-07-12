import { TestBed } from '@angular/core/testing';

import { respostaSimulacaoMock } from '../../testing/simulacao-response.mock';
import { GraficoFluxoCaixaComponent } from './grafico-fluxo-caixa.component';

describe('GraficoFluxoCaixaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraficoFluxoCaixaComponent],
    }).compileComponents();
  });

  function criar(paybackDescontadoMeses: number | null) {
    const fixture = TestBed.createComponent(GraficoFluxoCaixaComponent);
    fixture.componentRef.setInput('fluxoCaixa', respostaSimulacaoMock().fluxoCaixa);
    fixture.componentRef.setInput('paybackDescontadoMeses', paybackDescontadoMeses);
    fixture.detectChanges();
    return fixture;
  }

  it('monta os dois acumulados anos 0–25 e a linha de referência no zero', () => {
    const dados = criar(41).componentInstance.dados();

    expect(dados.labels?.length).toBe(26);
    expect(dados.labels?.[0]).toBe(0);
    expect(dados.labels?.[25]).toBe(25);

    expect(dados.datasets.length).toBe(3);
    expect(dados.datasets[0].label).toBe('Acumulado nominal');
    expect(dados.datasets[0].data[0]).toBe(-15400);
    expect(dados.datasets[0].data[25]).toBe(-15400 + 5514 * 25);
    expect(dados.datasets[1].label).toBe('Acumulado descontado');
    expect(dados.datasets[1].data[25]).toBe(-15400 + 4500 * 25);
    expect((dados.datasets[2].data as number[]).every((valor) => valor === 0)).toBeTrue();
  });

  it('destaca apenas o ponto do ano do payback descontado', () => {
    const dados = criar(41).componentInstance.dados();

    const raios = dados.datasets[1].pointRadius as number[];
    // 41 meses → o acumulado descontado cruza o zero durante o ano 4.
    expect(raios[4]).toBe(6);
    expect(raios.filter((raio) => raio === 6).length).toBe(1);
  });

  it('sem payback no horizonte não destaca ponto algum', () => {
    const dados = criar(null).componentInstance.dados();

    const raios = dados.datasets[1].pointRadius as number[];
    expect(raios.every((raio) => raio === 0)).toBeTrue();
  });

  it('renderiza o canvas do gráfico', () => {
    const fixture = criar(41);
    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
  });
});
