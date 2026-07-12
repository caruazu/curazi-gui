import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SimulacaoResponse } from '../../core/api/simulacao.models';
import { PaybackPipe } from '../../shared/payback.pipe';
import { GraficoFluxoCaixaComponent } from './grafico-fluxo-caixa.component';

const MESES_ABREVIADOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

@Component({
  selector: 'app-resultados',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PaybackPipe,
    GraficoFluxoCaixaComponent,
  ],
  templateUrl: './resultados.component.html',
  styleUrl: './resultados.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosComponent {
  readonly resultado = input.required<SimulacaoResponse>();
  /** Limpa os resultados na página (pino e formulário são mantidos). */
  readonly refazer = output<void>();

  /** "2026-05" → "mai/2026". */
  formatarVigencia(vigencia: string): string {
    const [ano, mes] = vigencia.split('-');
    const abreviacao = MESES_ABREVIADOS[Number(mes) - 1];
    return abreviacao ? `${abreviacao}/${ano}` : vigencia;
  }
}
