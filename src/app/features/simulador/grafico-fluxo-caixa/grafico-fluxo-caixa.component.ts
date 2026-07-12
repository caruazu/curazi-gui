import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { FluxoCaixaAnual } from '../../../core/api/simulacao.models';
import { formatarMoedaCompacta } from '../../../shared/pipes/moeda-compacta.pipe';

// Cores do tema validadas para daltonismo e contraste (validador da skill dataviz):
// verde = tom 40 da paleta primária, âmbar = tom 60 da terciária.
const COR_NOMINAL = '#2a6b2c';
const COR_DESCONTADO = '#c08600';
const COR_LINHA_ZERO = '#9e9e9e';
const ROTULO_LINHA_ZERO = 'zero';

const MOEDA_COMPLETA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Component({
  selector: 'app-grafico-fluxo-caixa',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './grafico-fluxo-caixa.component.html',
  styleUrl: './grafico-fluxo-caixa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoFluxoCaixaComponent {
  readonly fluxoCaixa = input.required<FluxoCaixaAnual[]>();
  readonly paybackDescontadoMeses = input<number | null>(null);

  readonly dados = computed<ChartData<'line'>>(() => {
    const fluxo = this.fluxoCaixa();
    const meses = this.paybackDescontadoMeses();
    // O acumulado descontado cruza o zero ao longo deste ano — ponto destacado.
    const anoPayback = meses === null ? null : Math.ceil(meses / 12);
    const raios = fluxo.map((item) => (item.ano === anoPayback ? 6 : 0));
    return {
      labels: fluxo.map((item) => item.ano),
      datasets: [
        {
          label: 'Acumulado nominal',
          data: fluxo.map((item) => item.acumuladoNominal),
          borderColor: COR_NOMINAL,
          backgroundColor: COR_NOMINAL,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: 'Acumulado descontado',
          data: fluxo.map((item) => item.acumuladoDescontado),
          borderColor: COR_DESCONTADO,
          backgroundColor: COR_DESCONTADO,
          borderWidth: 2,
          pointRadius: raios,
          pointHoverRadius: 6,
        },
        {
          // Linha de referência em R$ 0 — dataset constante é mais simples
          // que o plugin de annotation e não adiciona dependência.
          label: ROTULO_LINHA_ZERO,
          data: fluxo.map(() => 0),
          borderColor: COR_LINHA_ZERO,
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  });

  readonly opcoes: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { filter: (item) => item.text !== ROTULO_LINHA_ZERO },
      },
      tooltip: {
        filter: (item) => item.dataset.label !== ROTULO_LINHA_ZERO,
        callbacks: {
          title: (itens) => `Ano ${itens[0]?.label ?? ''}`,
          label: (item) => `${item.dataset.label}: ${MOEDA_COMPLETA.format(item.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Ano' }, grid: { display: false } },
      y: { ticks: { callback: (valor) => formatarMoedaCompacta(Number(valor)) } },
    },
  };
}
