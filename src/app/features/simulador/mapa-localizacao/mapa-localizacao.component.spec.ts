import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { GoogleMapsApi, GoogleMapsLoaderService } from '../../../core/maps/google-maps-loader.service';
import { respostaSimulacaoMock } from '../../../testing/simulacao-response.mock';
import {
  BOUNDS_MACEIO,
  CENTRO_MACEIO,
  Coordenada,
  ESTILO_GEOMETRIA,
  MapaLocalizacaoComponent,
  PADDING_ENQUADRAMENTO_PX,
} from './mapa-localizacao.component';

// Fakes da API do Google Maps — os testes nunca carregam a biblioteca real.

type OuvinteClique = (evento: { latLng: { lat(): number; lng(): number } | null }) => void;

class FakeMap {
  static instancias: FakeMap[] = [];
  readonly panTo = jasmine.createSpy('panTo');
  readonly setZoom = jasmine.createSpy('setZoom');
  readonly fitBounds = jasmine.createSpy('fitBounds');
  private ouvintes = new Map<string, OuvinteClique>();

  constructor(
    readonly elemento: HTMLElement,
    readonly opcoes: Record<string, unknown>,
  ) {
    FakeMap.instancias.push(this);
  }

  addListener(evento: string, ouvinte: OuvinteClique): void {
    this.ouvintes.set(evento, ouvinte);
  }

  simularClique(lat: number, lng: number): void {
    this.ouvintes.get('click')!({ latLng: { lat: () => lat, lng: () => lng } });
  }
}

class FakeMarker {
  static instancias: FakeMarker[] = [];
  position: unknown;
  map: unknown;

  constructor(opcoes: { map: unknown; position: unknown }) {
    this.map = opcoes.map;
    this.position = opcoes.position;
    FakeMarker.instancias.push(this);
  }
}

class FakePolygon {
  static instancias: FakePolygon[] = [];
  map: unknown;

  constructor(readonly opcoes: Record<string, unknown>) {
    this.map = opcoes['map'];
    FakePolygon.instancias.push(this);
  }

  setMap(mapa: unknown): void {
    this.map = mapa;
  }
}

class FakeGeocoder {
  static resultados: unknown[] = [];
  static falhar = false;
  static chamadas: Record<string, unknown>[] = [];

  static reiniciar(): void {
    FakeGeocoder.resultados = [];
    FakeGeocoder.falhar = false;
    FakeGeocoder.chamadas = [];
  }

  geocode(requisicao: Record<string, unknown>): Promise<{ results: unknown[] }> {
    FakeGeocoder.chamadas.push(requisicao);
    return FakeGeocoder.falhar
      ? Promise.reject(new Error('ZERO_RESULTS'))
      : Promise.resolve({ results: FakeGeocoder.resultados });
  }
}

class FakeSessionToken {
  static criados = 0;

  constructor() {
    FakeSessionToken.criados++;
  }
}

class FakeAutocompleteSuggestion {
  static sugestoes: unknown[] = [];
  static falhar = false;
  static chamadas: Record<string, unknown>[] = [];

  static reiniciar(): void {
    FakeAutocompleteSuggestion.sugestoes = [];
    FakeAutocompleteSuggestion.falhar = false;
    FakeAutocompleteSuggestion.chamadas = [];
    FakeSessionToken.criados = 0;
  }

  static fetchAutocompleteSuggestions(
    requisicao: Record<string, unknown>,
  ): Promise<{ suggestions: unknown[] }> {
    FakeAutocompleteSuggestion.chamadas.push(requisicao);
    return FakeAutocompleteSuggestion.falhar
      ? Promise.reject(new Error('erro'))
      : Promise.resolve({ suggestions: FakeAutocompleteSuggestion.sugestoes });
  }
}

/** Sugestão no formato retornado pela API (suggestion.placePrediction). */
function fakeSugestao(principal: string, localizacao: unknown) {
  const place = {
    location: null as unknown,
    fetchFields: (_opcoes: unknown) => {
      place.location = localizacao;
      return Promise.resolve({ place });
    },
  };
  return {
    placePrediction: {
      placeId: `id-${principal}`,
      mainText: { text: principal },
      secondaryText: { text: 'Maceió - AL' },
      text: { text: `${principal}, Maceió - AL` },
      toPlace: () => place,
    },
  };
}

const FAKE_API = {
  Map: FakeMap,
  Polygon: FakePolygon,
  AdvancedMarkerElement: FakeMarker,
  Geocoder: FakeGeocoder,
  AutocompleteSuggestion: FakeAutocompleteSuggestion,
  AutocompleteSessionToken: FakeSessionToken,
} as unknown as GoogleMapsApi;

describe('MapaLocalizacaoComponent', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    FakeMap.instancias = [];
    FakeMarker.instancias = [];
    FakePolygon.instancias = [];
    FakeGeocoder.reiniciar();
    FakeAutocompleteSuggestion.reiniciar();
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [MapaLocalizacaoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: GoogleMapsLoaderService,
          useValue: { carregar: () => Promise.resolve(FAKE_API) },
        },
      ],
    }).compileComponents();
  });

  async function criar(): Promise<ComponentFixture<MapaLocalizacaoComponent>> {
    const fixture = TestBed.createComponent(MapaLocalizacaoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  /** Versão síncrona para testes fakeAsync (debounce do autocomplete). */
  function criarSync(): ComponentFixture<MapaLocalizacaoComponent> {
    const fixture = TestBed.createComponent(MapaLocalizacaoComponent);
    fixture.detectChanges();
    flushMicrotasks();
    fixture.detectChanges();
    return fixture;
  }

  it('cria o mapa com as opções da especificação', async () => {
    const fixture = await criar();

    expect(fixture.componentInstance.estadoMapa()).toBe('pronto');
    const mapa = FakeMap.instancias[0];
    expect(mapa.opcoes['center']).toEqual(CENTRO_MACEIO);
    expect(mapa.opcoes['zoom']).toBe(12);
    expect(mapa.opcoes['mapTypeId']).toBe('hybrid');
    expect(mapa.opcoes['gestureHandling']).toBe('greedy');
    expect(mapa.opcoes['clickableIcons']).toBeFalse();
    expect(mapa.opcoes['mapId']).toBeTruthy();
  });

  it('clique no mapa posiciona o pino, emite a coordenada e mostra o endereço', async () => {
    FakeGeocoder.resultados = [{ formatted_address: 'R. Eng. Mário de Gusmão - Ponta Verde' }];
    const fixture = await criar();
    const emitidas: Coordenada[] = [];
    fixture.componentInstance.coordenada.subscribe((c) => emitidas.push(c));

    FakeMap.instancias[0].simularClique(-9.6601, -35.7002);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(emitidas).toEqual([{ lat: -9.6601, lng: -35.7002 }]);
    expect(FakeMarker.instancias.length).toBe(1);
    expect(FakeMarker.instancias[0].position).toEqual({ lat: -9.6601, lng: -35.7002 });
    expect(FakeGeocoder.chamadas[0]['location']).toEqual({ lat: -9.6601, lng: -35.7002 });
    expect(fixture.nativeElement.textContent).toContain(
      'Endereço aproximado: R. Eng. Mário de Gusmão - Ponta Verde',
    );
  });

  it('segundo clique move o mesmo pino em vez de criar outro', async () => {
    const fixture = await criar();

    FakeMap.instancias[0].simularClique(-9.66, -35.7);
    FakeMap.instancias[0].simularClique(-9.67, -35.71);
    await fixture.whenStable();

    expect(FakeMarker.instancias.length).toBe(1);
    expect(FakeMarker.instancias[0].position).toEqual({ lat: -9.67, lng: -35.71 });
  });

  it('informa quando o endereço do ponto não está disponível', async () => {
    FakeGeocoder.falhar = true;
    const fixture = await criar();

    FakeMap.instancias[0].simularClique(-9.66, -35.7);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Endereço aproximado indisponível para este ponto.',
    );
  });

  describe('sugestões de endereço (autocomplete)', () => {
    function digitar(fixture: ComponentFixture<MapaLocalizacaoComponent>, texto: string) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.focus();
      input.value = texto;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    it('busca sugestões após o debounce com restrição a Maceió', fakeAsync(() => {
      FakeAutocompleteSuggestion.sugestoes = [fakeSugestao('Ponta Verde', {})];
      const fixture = criarSync();

      digitar(fixture, 'Ponta Verde');
      expect(FakeAutocompleteSuggestion.chamadas.length).toBe(0);
      tick(300);
      flushMicrotasks();

      expect(FakeAutocompleteSuggestion.chamadas.length).toBe(1);
      const requisicao = FakeAutocompleteSuggestion.chamadas[0];
      expect(requisicao['input']).toBe('Ponta Verde');
      expect(requisicao['locationRestriction']).toEqual(BOUNDS_MACEIO);
      expect(requisicao['includedRegionCodes']).toEqual(['br']);
      expect(requisicao['sessionToken']).toBeInstanceOf(FakeSessionToken);
      expect(fixture.componentInstance.sugestoes().length).toBe(1);
    }));

    it('não busca com menos de 3 caracteres', fakeAsync(() => {
      const fixture = criarSync();

      digitar(fixture, 'Po');
      tick(300);
      flushMicrotasks();

      expect(FakeAutocompleteSuggestion.chamadas.length).toBe(0);
      expect(fixture.componentInstance.sugestoes()).toEqual([]);
    }));

    it('reusa o session token na sessão e renova após a seleção', fakeAsync(() => {
      FakeAutocompleteSuggestion.sugestoes = [fakeSugestao('Ponta Verde', {})];
      const fixture = criarSync();

      digitar(fixture, 'Ponta');
      tick(300);
      flushMicrotasks();
      digitar(fixture, 'Ponta Verde');
      tick(300);
      flushMicrotasks();

      const chamadas = FakeAutocompleteSuggestion.chamadas;
      expect(chamadas.length).toBe(2);
      expect(chamadas[1]['sessionToken']).toBe(chamadas[0]['sessionToken']);
      expect(FakeSessionToken.criados).toBe(1);

      const predicao = fixture.componentInstance.sugestoes()[0];
      void fixture.componentInstance.aoSelecionarSugestao(predicao);
      flushMicrotasks();

      digitar(fixture, 'Outra rua qualquer');
      tick(300);
      flushMicrotasks();

      expect(FakeSessionToken.criados).toBe(2);
      expect(chamadas[2]['sessionToken']).not.toBe(chamadas[0]['sessionToken']);
    }));

    it('selecionar sugestão pelo DOM centraliza com zoom 19 e avisa, sem posicionar pino', fakeAsync(() => {
      const localizacao = { lat: -9.6601, lng: -35.7002 };
      FakeAutocompleteSuggestion.sugestoes = [fakeSugestao('Ponta Verde', localizacao)];
      const fixture = criarSync();

      digitar(fixture, 'Ponta Verde');
      tick(300);
      flushMicrotasks();
      fixture.detectChanges();

      const opcoes = document.querySelectorAll('mat-option');
      expect(opcoes.length).toBe(1);
      expect(opcoes[0].textContent).toContain('Ponta Verde');
      (opcoes[0] as HTMLElement).click();
      flushMicrotasks();
      fixture.detectChanges();

      const mapa = FakeMap.instancias[0];
      expect(mapa.panTo).toHaveBeenCalledWith(localizacao);
      expect(mapa.setZoom).toHaveBeenCalledWith(19);
      expect(snackBar.open).toHaveBeenCalledWith('Ajuste o pino sobre o telhado', undefined, {
        duration: 5000,
      });
      expect(FakeMarker.instancias.length).toBe(0);
      tick(300); // esvazia o debounce disparado pela escrita da seleção no campo
    }));
  });

  describe('geometria da simulação (holofote, segmentos e painéis)', () => {
    const geometria = () => respostaSimulacaoMock().geometria!;

    it('desenharGeometria cria 1 holofote + 1 por segmento + 1 por painel, todos clickable: false', async () => {
      const fixture = await criar();

      fixture.componentInstance.desenharGeometria(geometria());

      // Mock: 1 edifício, 1 segmento e 8 painéis (= quantidadeModulos).
      expect(FakePolygon.instancias.length).toBe(10);
      for (const poligono of FakePolygon.instancias) {
        expect(poligono.opcoes['clickable']).toBeFalse();
        expect(poligono.map).toBe(FakeMap.instancias[0] as unknown);
      }
    });

    it('holofote tem dois anéis (externo expandido e furo com winding invertido), sem borda', async () => {
      const fixture = await criar();

      fixture.componentInstance.desenharGeometria(geometria());

      const holofote = FakePolygon.instancias[0];
      expect(holofote.opcoes['fillColor']).toBe(ESTILO_GEOMETRIA.holofote.fillColor);
      expect(holofote.opcoes['fillOpacity']).toBe(ESTILO_GEOMETRIA.holofote.fillOpacity);
      expect(holofote.opcoes['strokeWeight']).toBe(0);

      const [externo, interno] = holofote.opcoes['paths'] as { lat: number; lng: number }[][];
      expect(externo.length).toBe(4);
      expect(interno.length).toBe(4);
      const box = geometria().boundingBoxEdificio!;
      // Furo = box do edifício; ordem invertida (nw → ne → se → sw) abre o furo.
      expect(interno[0]).toEqual({ lat: box.ne.lat, lng: box.sw.lng });
      expect(interno[3]).toEqual({ lat: box.sw.lat, lng: box.sw.lng });
      // Anel externo expandido: contém o box com folga.
      expect(externo[0].lat).toBeLessThan(box.sw.lat);
      expect(externo[2].lat).toBeGreaterThan(box.ne.lat);
    });

    it('segmentos e painéis usam as cores e opacidades das constantes', async () => {
      const fixture = await criar();

      fixture.componentInstance.desenharGeometria(geometria());

      const segmento = FakePolygon.instancias[1];
      expect(segmento.opcoes['fillColor']).toBe(ESTILO_GEOMETRIA.segmento.fillColor);
      expect(segmento.opcoes['fillOpacity']).toBe(ESTILO_GEOMETRIA.segmento.fillOpacity);
      expect(segmento.opcoes['strokeWeight']).toBe(1);

      const painel = FakePolygon.instancias[2];
      expect(painel.opcoes['fillColor']).toBe(ESTILO_GEOMETRIA.painel.fillColor);
      expect(painel.opcoes['fillOpacity']).toBe(ESTILO_GEOMETRIA.painel.fillOpacity);
      expect((painel.opcoes['paths'] as unknown[]).length).toBe(4);
    });

    it('sem boundingBoxEdificio não desenha holofote, mas mantém segmentos e painéis', async () => {
      const fixture = await criar();

      fixture.componentInstance.desenharGeometria({ ...geometria(), boundingBoxEdificio: null });

      expect(FakePolygon.instancias.length).toBe(9);
      expect(FakePolygon.instancias[0].opcoes['fillColor']).toBe(
        ESTILO_GEOMETRIA.segmento.fillColor,
      );
    });

    it('limparGeometria tira todos os polígonos do mapa', async () => {
      const fixture = await criar();
      fixture.componentInstance.desenharGeometria(geometria());

      fixture.componentInstance.limparGeometria();

      expect(FakePolygon.instancias.every((p) => p.map === null)).toBeTrue();
    });

    it('desenhar de novo substitui a geometria anterior em vez de acumular', async () => {
      const fixture = await criar();
      fixture.componentInstance.desenharGeometria(geometria());

      fixture.componentInstance.desenharGeometria(geometria());

      const noMapa = FakePolygon.instancias.filter((p) => p.map !== null);
      expect(FakePolygon.instancias.length).toBe(20);
      expect(noMapa.length).toBe(10);
    });

    it('enquadrar chama fitBounds com o box do edifício e padding', async () => {
      const fixture = await criar();
      const box = geometria().boundingBoxEdificio!;

      fixture.componentInstance.enquadrar(box);

      expect(FakeMap.instancias[0].fitBounds).toHaveBeenCalledWith(
        { north: box.ne.lat, south: box.sw.lat, east: box.ne.lng, west: box.sw.lng },
        PADDING_ENQUADRAMENTO_PX,
      );
    });

    it('antes de o mapa carregar, desenharGeometria e limparGeometria não quebram', () => {
      const fixture = TestBed.createComponent(MapaLocalizacaoComponent);
      fixture.detectChanges();

      expect(() => {
        fixture.componentInstance.desenharGeometria(geometria());
        fixture.componentInstance.limparGeometria();
      }).not.toThrow();
      expect(FakePolygon.instancias.length).toBe(0);
    });
  });

  describe('fallback de busca pelo Geocoder (Enter/lupa sem seleção)', () => {
    it('busca centraliza o mapa com zoom 19 e avisa para ajustar o pino, sem posicionar pino', async () => {
      const localizacao = { lat: -9.6601, lng: -35.7002 };
      FakeGeocoder.resultados = [{ geometry: { location: localizacao } }];
      const fixture = await criar();

      fixture.componentInstance.campoBusca.setValue('Ponta Verde, Maceió');
      await fixture.componentInstance.buscarEndereco();

      const requisicao = FakeGeocoder.chamadas[0];
      expect(requisicao['address']).toBe('Ponta Verde, Maceió');
      expect(requisicao['componentRestrictions']).toEqual({ country: 'br' });
      expect(requisicao['bounds']).toEqual(BOUNDS_MACEIO);

      const mapa = FakeMap.instancias[0];
      expect(mapa.panTo).toHaveBeenCalledWith(localizacao);
      expect(mapa.setZoom).toHaveBeenCalledWith(19);
      expect(snackBar.open).toHaveBeenCalledWith('Ajuste o pino sobre o telhado', undefined, {
        duration: 5000,
      });
      expect(FakeMarker.instancias.length).toBe(0);
    });

    it('submeter o formulário pelo DOM dispara a busca', async () => {
      FakeGeocoder.resultados = [{ geometry: { location: { lat: -9.66, lng: -35.7 } } }];
      const fixture = await criar();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.value = 'Ponta Verde, Maceió';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(FakeGeocoder.chamadas.length).toBe(1);
      expect(FakeGeocoder.chamadas[0]['address']).toBe('Ponta Verde, Maceió');
      expect(FakeMap.instancias[0].setZoom).toHaveBeenCalledWith(19);
    });

    it('busca sem resultado exibe "Endereço não encontrado"', async () => {
      FakeGeocoder.resultados = [];
      const fixture = await criar();

      fixture.componentInstance.campoBusca.setValue('Rua Inexistente 999, Lugar Nenhum');
      await fixture.componentInstance.buscarEndereco();
      fixture.detectChanges();

      expect(fixture.componentInstance.campoBusca.hasError('naoEncontrado')).toBeTrue();
      expect(fixture.nativeElement.querySelector('mat-error')?.textContent).toContain(
        'Endereço não encontrado',
      );
      expect(FakeMap.instancias[0].panTo).not.toHaveBeenCalled();
    });
  });
});
