import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

import { SimulacaoRequest, SimulacaoResponse } from '../../core/api/simulacao.models';
import { ErroSimulacao } from '../../core/api/simulacao.service';
import { Coordenada, MapaLocalizacaoComponent } from './mapa-localizacao.component';
import { FormularioContaComponent } from './formulario-conta.component';
import { PainelAvancadoComponent } from './painel-avancado.component';

@Component({
  selector: 'app-simulador-page',
  imports: [
    MatToolbarModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MapaLocalizacaoComponent,
    FormularioContaComponent,
    PainelAvancadoComponent,
  ],
  templateUrl: './simulador-page.component.html',
  styleUrl: './simulador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimuladorPageComponent {
  private readonly painelAvancado = viewChild.required(PainelAvancadoComponent);

  /** Ponto do telhado apontado no mapa; obrigatório para simular. */
  readonly coordenada = signal<Coordenada | null>(null);
  /** Valor válido da conta (null enquanto vazio/inválido). */
  readonly valorConta = signal<number | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<ErroSimulacao | null>(null);
  readonly resultado = signal<SimulacaoResponse | null>(null);

  readonly podeSimular = computed(
    () => this.coordenada() !== null && this.valorConta() !== null && !this.carregando(),
  );

  simular(): void {
    const coordenada = this.coordenada();
    const valorContaMensal = this.valorConta();
    if (coordenada === null || valorContaMensal === null || this.carregando()) {
      return;
    }

    const request: SimulacaoRequest = {
      latitude: coordenada.lat,
      longitude: coordenada.lng,
      valorContaMensal,
    };
    const parametrosAvancados = this.painelAvancado().montarParametros();
    if (parametrosAvancados) {
      request.parametrosAvancados = parametrosAvancados;
    }

    // Etapa 2.4 chamará o SimulacaoService com este request.
    console.log('SimulacaoRequest', request);
  }
}
