import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

import { SimulacaoRequest, SimulacaoResponse } from '../../../core/api/simulacao.models';
import {
  ErroSimulacao,
  SimulacaoService,
  SlugErroSimulacao,
} from '../../../core/api/simulacao.service';
import { Coordenada, MapaLocalizacaoComponent } from '../mapa-localizacao/mapa-localizacao.component';
import { FormularioContaComponent } from '../formulario-conta/formulario-conta.component';
import { PainelAvancadoComponent } from '../painel-avancado/painel-avancado.component';
import { ResultadosComponent } from '../resultados/resultados.component';

/** Erros exibidos em MatSnackBar com retry; os demais viram banner na seção 2. */
const ERROS_TRANSITORIOS: SlugErroSimulacao[] = ['servico-solar-indisponivel', 'falha-de-rede'];

@Component({
  selector: 'app-simulador-page',
  imports: [
    MatToolbarModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MapaLocalizacaoComponent,
    FormularioContaComponent,
    PainelAvancadoComponent,
    ResultadosComponent,
  ],
  templateUrl: './simulador-page.component.html',
  styleUrl: './simulador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimuladorPageComponent {
  private readonly simulacaoService = inject(SimulacaoService);
  private readonly snackBar = inject(MatSnackBar);
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

  private ultimaRequisicao?: SimulacaoRequest;

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
    this.executarSimulacao(request);
  }

  refazerSimulacao(): void {
    this.resultado.set(null);
    this.erro.set(null);
    this.rolarPara('localizacao');
  }

  private executarSimulacao(request: SimulacaoRequest): void {
    this.ultimaRequisicao = request;
    this.carregando.set(true);
    this.erro.set(null);
    this.simulacaoService.simular(request).subscribe({
      next: (resposta) => {
        this.carregando.set(false);
        this.resultado.set(resposta);
        // O painel exibe os valores efetivamente usados, prontos para refinamento.
        this.painelAvancado().preencherCom(resposta.parametrosUtilizados);
        // Foco na seção para leitores de tela anunciarem os resultados.
        this.rolarPara('resultados', { focar: true });
      },
      error: (erro: ErroSimulacao) => {
        this.carregando.set(false);
        this.tratarErro(erro);
      },
    });
  }

  private tratarErro(erro: ErroSimulacao): void {
    if (ERROS_TRANSITORIOS.includes(erro.slug)) {
      this.snackBar
        .open(erro.mensagemUsuario, 'Tentar de novo', { duration: 8000 })
        .onAction()
        .subscribe(() => this.executarSimulacao(this.ultimaRequisicao!));
      return;
    }
    this.erro.set(erro);
  }

  private rolarPara(id: string, opcoes?: { focar?: boolean }): void {
    const alvo = document.getElementById(id);
    if (!alvo) {
      return;
    }
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth' });
    if (opcoes?.focar) {
      alvo.focus({ preventScroll: true });
    }
  }
}
