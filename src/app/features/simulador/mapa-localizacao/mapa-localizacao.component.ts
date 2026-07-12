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

import { BoundingBoxGeo, GeometriaTelhado } from '../../../core/api/simulacao.models';
import {
  cantosDoPainel,
  expandirBoundingBox,
  retanguloDeBoundingBox,
} from '../../../core/maps/geometria-mapa';
import { GoogleMapsApi, GoogleMapsLoaderService } from '../../../core/maps/google-maps-loader.service';

export interface Coordenada {
  lat: number;
  lng: number;
}

/**
 * Estilo das camadas ilustrativas desenhadas após a simulação. Cores do tema
 * M3 (primária verde e terciária âmbar — ver theme-colors.scss).
 */
export const ESTILO_GEOMETRIA = {
  /** Escurece o entorno: anel externo = box do edifício expandido; furo = o próprio box. */
  holofote: {
    fatorExpansao: 15,
    fillColor: '#000000',
    fillOpacity: 0.4,
  },
  segmento: {
    fillColor: '#2a6b2c',
    fillOpacity: 0.15,
    strokeColor: '#2a6b2c',
    strokeOpacity: 0.5,
    strokeWeight: 1,
  },
  painel: {
    fillColor: '#ffb300',
    fillOpacity: 0.45,
    strokeColor: '#604100',
    strokeOpacity: 1,
    strokeWeight: 1,
  },
} as const;

/** Respiro em px ao enquadrar o edifício com fitBounds. */
export const PADDING_ENQUADRAMENTO_PX = 48;

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
  /** Polígonos ilustrativos da última simulação (holofote, segmentos, painéis). */
  private poligonos: google.maps.Polygon[] = [];
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

  /**
   * Desenha as três camadas ilustrativas da simulação (holofote, segmentos e
   * painéis). Sem interatividade: todos os polígonos têm clickable: false para
   * não bloquear o clique que posiciona o pino.
   */
  desenharGeometria(geometria: GeometriaTelhado): void {
    if (!this.api || !this.mapa) {
      return;
    }
    this.limparGeometria();

    if (geometria.boundingBoxEdificio) {
      const box = geometria.boundingBoxEdificio;
      const boxExpandido = expandirBoundingBox(box, ESTILO_GEOMETRIA.holofote.fatorExpansao);
      const anelExterno = retanguloDeBoundingBox(boxExpandido.sw, boxExpandido.ne);
      // Winding invertido em relação ao externo abre o furo do holofote.
      const anelInterno = retanguloDeBoundingBox(box.sw, box.ne).reverse();
      this.poligonos.push(
        new this.api.Polygon({
          map: this.mapa,
          paths: [anelExterno, anelInterno],
          fillColor: ESTILO_GEOMETRIA.holofote.fillColor,
          fillOpacity: ESTILO_GEOMETRIA.holofote.fillOpacity,
          strokeWeight: 0,
          clickable: false,
        }),
      );
    }

    for (const segmento of geometria.segmentosTelhado) {
      this.poligonos.push(
        new this.api.Polygon({
          map: this.mapa,
          paths: retanguloDeBoundingBox(segmento.boundingBox.sw, segmento.boundingBox.ne),
          ...ESTILO_GEOMETRIA.segmento,
          clickable: false,
        }),
      );
    }

    for (const painel of geometria.paineis) {
      const segmento = geometria.segmentosTelhado[painel.indiceSegmento];
      this.poligonos.push(
        new this.api.Polygon({
          map: this.mapa,
          paths: cantosDoPainel(
            painel.centro,
            geometria.painelAlturaMetros,
            geometria.painelLarguraMetros,
            painel.orientacao,
            segmento?.azimuteGraus ?? 0,
            segmento?.inclinacaoGraus ?? 0,
          ),
          ...ESTILO_GEOMETRIA.painel,
          clickable: false,
        }),
      );
    }
  }

  /** Remove do mapa todos os polígonos da simulação anterior. */
  limparGeometria(): void {
    for (const poligono of this.poligonos) {
      poligono.setMap(null);
    }
    this.poligonos = [];
  }

  /** Enquadra o edifício analisado com um respiro confortável. */
  enquadrar(boundingBox: BoundingBoxGeo): void {
    this.mapa?.fitBounds(
      {
        north: boundingBox.ne.lat,
        south: boundingBox.sw.lat,
        east: boundingBox.ne.lng,
        west: boundingBox.sw.lng,
      },
      PADDING_ENQUADRAMENTO_PX,
    );
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
