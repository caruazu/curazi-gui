import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

import { Coordenada, MapaLocalizacaoComponent } from './mapa-localizacao.component';

@Component({
  selector: 'app-simulador-page',
  imports: [MatToolbarModule, MatCardModule, MatDividerModule, MapaLocalizacaoComponent],
  templateUrl: './simulador-page.component.html',
  styleUrl: './simulador-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimuladorPageComponent {
  /** Ponto do telhado apontado no mapa; obrigatório para simular. */
  readonly coordenada = signal<Coordenada | null>(null);
}
