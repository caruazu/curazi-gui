import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GoogleMapsApi, GoogleMapsLoaderService } from '../../core/maps/google-maps-loader.service';

export interface Coordenada {
  lat: number;
  lng: number;
}

export const CENTRO_MACEIO: Coordenada = { lat: -9.6499, lng: -35.7089 };

/** Bounding box da área atendida (Maceió) — espelha a validação do backend. */
export const BOUNDS_MACEIO: google.maps.LatLngBoundsLiteral = {
  north: -9.53,
  south: -9.78,
  east: -35.62,
  west: -35.88,
};

// AdvancedMarkerElement exige um mapId. Trocar por um Map ID do projeto no
// Google Cloud quando houver estilização própria.
const MAP_ID = 'CURAZI_MAPA';

type EstadoMapa = 'carregando' | 'pronto' | 'erro';
type EstadoEndereco = 'nenhum' | 'buscando' | 'encontrado' | 'indisponivel';

@Component({
  selector: 'app-mapa-localizacao',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './mapa-localizacao.component.html',
  styleUrl: './mapa-localizacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaLocalizacaoComponent implements AfterViewInit {
  private readonly loaderService = inject(GoogleMapsLoaderService);
  private readonly zone = inject(NgZone);
  private readonly snackBar = inject(MatSnackBar);

  private readonly containerMapa = viewChild.required<ElementRef<HTMLDivElement>>('containerMapa');

  /** Última coordenada apontada pelo clique no mapa. */
  readonly coordenada = output<Coordenada>();

  readonly estadoMapa = signal<EstadoMapa>('carregando');
  readonly estadoEndereco = signal<EstadoEndereco>('nenhum');
  readonly enderecoAproximado = signal<string | null>(null);
  readonly buscando = signal(false);

  readonly campoBusca = new FormControl('', { nonNullable: true });

  private api?: GoogleMapsApi;
  private mapa?: google.maps.Map;
  private geocoder?: google.maps.Geocoder;
  private marcador?: google.maps.marker.AdvancedMarkerElement;
  // Descarta respostas de reverse geocode que chegam fora de ordem.
  private versaoEndereco = 0;

  ngAfterViewInit(): void {
    void this.iniciarMapa();
  }

  private async iniciarMapa(): Promise<void> {
    let api: GoogleMapsApi;
    try {
      api = await this.loaderService.carregar();
    } catch {
      this.zone.run(() => this.estadoMapa.set('erro'));
      return;
    }

    this.zone.run(() => {
      this.api = api;
      this.mapa = new api.Map(this.containerMapa().nativeElement, {
        center: CENTRO_MACEIO,
        zoom: 12,
        mapTypeId: 'hybrid',
        mapId: MAP_ID,
        gestureHandling: 'greedy',
        // POIs não abrem InfoWindow — o clique serve só para posicionar o pino.
        clickableIcons: false,
      });
      this.geocoder = new api.Geocoder();
      this.mapa.addListener('click', (evento: google.maps.MapMouseEvent) =>
        this.zone.run(() => this.aoClicarNoMapa(evento)),
      );
      this.estadoMapa.set('pronto');
    });
  }

  private aoClicarNoMapa(evento: google.maps.MapMouseEvent): void {
    const posicao = evento.latLng;
    if (!posicao) {
      return;
    }
    const coordenada: Coordenada = { lat: posicao.lat(), lng: posicao.lng() };
    this.posicionarMarcador(coordenada);
    this.coordenada.emit(coordenada);
    void this.buscarEnderecoDoPonto(coordenada);
  }

  private posicionarMarcador(coordenada: Coordenada): void {
    if (this.marcador) {
      this.marcador.position = coordenada;
    } else {
      this.marcador = new this.api!.AdvancedMarkerElement({
        map: this.mapa,
        position: coordenada,
      });
    }
  }

  private async buscarEnderecoDoPonto(coordenada: Coordenada): Promise<void> {
    const versao = ++this.versaoEndereco;
    this.estadoEndereco.set('buscando');
    let endereco: string | null = null;
    try {
      const { results } = await this.geocoder!.geocode({ location: coordenada });
      endereco = results[0]?.formatted_address ?? null;
    } catch {
      endereco = null;
    }
    this.zone.run(() => {
      if (versao !== this.versaoEndereco) {
        return;
      }
      this.enderecoAproximado.set(endereco);
      this.estadoEndereco.set(endereco ? 'encontrado' : 'indisponivel');
    });
  }

  async buscarEndereco(): Promise<void> {
    const termo = this.campoBusca.value.trim();
    if (!termo || this.estadoMapa() !== 'pronto' || this.buscando()) {
      return;
    }
    this.buscando.set(true);
    let localizacao: google.maps.LatLng | null = null;
    try {
      const { results } = await this.geocoder!.geocode({
        address: termo,
        componentRestrictions: { country: 'br' },
        bounds: BOUNDS_MACEIO,
      });
      localizacao = results[0]?.geometry.location ?? null;
    } catch {
      localizacao = null;
    }
    this.zone.run(() => {
      this.buscando.set(false);
      if (!localizacao) {
        this.campoBusca.setErrors({ naoEncontrado: true });
        this.campoBusca.markAsTouched();
        return;
      }
      // A busca só centraliza — o pino é posicionado pelo clique no telhado.
      this.mapa!.panTo(localizacao);
      this.mapa!.setZoom(19);
      this.containerMapa().nativeElement.focus();
      this.snackBar.open('Ajuste o pino sobre o telhado', undefined, { duration: 5000 });
    });
  }
}
