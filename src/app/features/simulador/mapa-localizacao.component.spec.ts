import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { GoogleMapsApi, GoogleMapsLoaderService } from '../../core/maps/google-maps-loader.service';
import {
  BOUNDS_MACEIO,
  CENTRO_MACEIO,
  Coordenada,
  MapaLocalizacaoComponent,
} from './mapa-localizacao.component';

// Fakes da API do Google Maps — os testes nunca carregam a biblioteca real.

type OuvinteClique = (evento: { latLng: { lat(): number; lng(): number } | null }) => void;

class FakeMap {
  static instancias: FakeMap[] = [];
  readonly panTo = jasmine.createSpy('panTo');
  readonly setZoom = jasmine.createSpy('setZoom');
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

const FAKE_API = {
  Map: FakeMap,
  AdvancedMarkerElement: FakeMarker,
  Geocoder: FakeGeocoder,
} as unknown as GoogleMapsApi;

describe('MapaLocalizacaoComponent', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    FakeMap.instancias = [];
    FakeMarker.instancias = [];
    FakeGeocoder.reiniciar();
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
