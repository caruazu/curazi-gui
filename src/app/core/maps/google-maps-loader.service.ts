import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

import { environment } from '../../../environments/environment';

/**
 * Subconjunto da API do Google Maps usado pela aplicação. Os componentes
 * recebem estes construtores em vez de acessar o global `google` — isso
 * permite substituí-los por fakes nos testes.
 */
export interface GoogleMapsApi {
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  Geocoder: typeof google.maps.Geocoder;
  AutocompleteSuggestion: typeof google.maps.places.AutocompleteSuggestion;
  AutocompleteSessionToken: typeof google.maps.places.AutocompleteSessionToken;
}

/** Carrega a biblioteca do Google Maps uma única vez para toda a aplicação. */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private carregamento?: Promise<GoogleMapsApi>;

  /** Fica `true` quando a biblioteca terminou de carregar. */
  readonly pronto = signal(false);

  carregar(): Promise<GoogleMapsApi> {
    this.carregamento ??= this.importarBibliotecas();
    return this.carregamento;
  }

  private async importarBibliotecas(): Promise<GoogleMapsApi> {
    setOptions({
      key: environment.googleMapsBrowserKey,
      v: 'weekly',
      language: 'pt-BR',
      region: 'BR',
      libraries: ['marker', 'geocoding', 'places'],
    });
    const [maps, marker, geocoding, places] = await Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('geocoding'),
      importLibrary('places'),
    ]);
    this.pronto.set(true);
    return {
      Map: maps.Map,
      AdvancedMarkerElement: marker.AdvancedMarkerElement,
      Geocoder: geocoding.Geocoder,
      AutocompleteSuggestion: places.AutocompleteSuggestion,
      AutocompleteSessionToken: places.AutocompleteSessionToken,
    };
  }
}
