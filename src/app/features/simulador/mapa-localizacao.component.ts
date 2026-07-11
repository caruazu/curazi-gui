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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs';

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

/** Padrão de mercado para autocomplete: aguarda a digitação assentar. */
const DEBOUNCE_BUSCA_MS = 300;
const MINIMO_CARACTERES_BUSCA = 3;

type EstadoMapa = 'carregando' | 'pronto' | 'erro';
type EstadoEndereco = 'nenhum' | 'buscando' | 'encontrado' | 'indisponivel';

@Component({
  selector: 'app-mapa-localizacao',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
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
  readonly sugestoes = signal<google.maps.places.PlacePrediction[]>([]);

  // Enquanto digita o valor é string; ao selecionar uma sugestão o
  // mat-autocomplete grava o PlacePrediction (exibido via exibirSugestao).
  readonly campoBusca = new FormControl<string | google.maps.places.PlacePrediction>('', {
    nonNullable: true,
  });

  private api?: GoogleMapsApi;
  private mapa?: google.maps.Map;
  private geocoder?: google.maps.Geocoder;
  private marcador?: google.maps.marker.AdvancedMarkerElement;
  // Uma sessão de autocomplete vai do primeiro caractere até a seleção;
  // reusar o token nesse intervalo é o que faz o Google cobrar por sessão.
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  // Descartam respostas assíncronas que chegam fora de ordem.
  private versaoEndereco = 0;
  private versaoSugestoes = 0;

  constructor() {
    this.campoBusca.valueChanges
      .pipe(debounceTime(DEBOUNCE_BUSCA_MS), takeUntilDestroyed())
      .subscribe((termo) => void this.buscarSugestoes(termo));
  }

  ngAfterViewInit(): void {
    void this.iniciarMapa();
  }

  exibirSugestao(valor: string | google.maps.places.PlacePrediction | null): string {
    if (valor === null || typeof valor === 'string') {
      return valor ?? '';
    }
    return valor.text.text;
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

  private async buscarSugestoes(
    valor: string | google.maps.places.PlacePrediction,
  ): Promise<void> {
    // Valor não-string = sugestão recém-selecionada; nada a buscar.
    if (!this.api || typeof valor !== 'string' || valor.trim().length < MINIMO_CARACTERES_BUSCA) {
      this.sugestoes.set([]);
      return;
    }
    const versao = ++this.versaoSugestoes;
    this.sessionToken ??= new this.api.AutocompleteSessionToken();
    let predicoes: google.maps.places.PlacePrediction[] = [];
    try {
      const { suggestions } = await this.api.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: valor.trim(),
        sessionToken: this.sessionToken,
        locationRestriction: BOUNDS_MACEIO,
        includedRegionCodes: ['br'],
      });
      predicoes = suggestions
        .map((sugestao) => sugestao.placePrediction)
        .filter((predicao): predicao is google.maps.places.PlacePrediction => predicao !== null);
    } catch {
      predicoes = [];
    }
    this.zone.run(() => {
      if (versao === this.versaoSugestoes) {
        this.sugestoes.set(predicoes);
      }
    });
  }

  async aoSelecionarSugestao(predicao: google.maps.places.PlacePrediction): Promise<void> {
    this.sugestoes.set([]);
    const place = predicao.toPlace();
    try {
      // Consome a sessão de autocomplete (o token da busca vai junto).
      await place.fetchFields({ fields: ['location'] });
    } catch {
      this.zone.run(() => this.campoBusca.setErrors({ naoEncontrado: true }));
      return;
    } finally {
      this.sessionToken = undefined;
    }
    this.zone.run(() => this.centralizarEm(place.location ?? null));
  }

  /** Fallback: Enter/lupa sem selecionar sugestão cai no Geocoder. */
  async buscarEndereco(): Promise<void> {
    const valor = this.campoBusca.value;
    const termo = (typeof valor === 'string' ? valor : valor.text.text).trim();
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
      this.centralizarEm(localizacao);
    });
  }

  // A busca só centraliza — o pino é posicionado pelo clique no telhado.
  private centralizarEm(localizacao: google.maps.LatLng | null): void {
    if (!localizacao) {
      this.campoBusca.setErrors({ naoEncontrado: true });
      return;
    }
    this.mapa!.panTo(localizacao);
    this.mapa!.setZoom(19);
    this.containerMapa().nativeElement.focus();
    this.snackBar.open('Ajuste o pino sobre o telhado', undefined, { duration: 5000 });
  }
}
