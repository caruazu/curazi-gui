import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { GoogleMapsLoaderService } from '../../core/maps/google-maps-loader.service';
import { SimuladorPageComponent } from './simulador-page.component';

describe('SimuladorPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimuladorPageComponent],
      providers: [
        provideNoopAnimations(),
        // O mapa fica em "carregando" — os testes da página não carregam o Google real.
        {
          provide: GoogleMapsLoaderService,
          useValue: { carregar: () => new Promise(() => {}) },
        },
      ],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(SimuladorPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('exibe o header com logotipo e tagline', () => {
    const el = render();
    expect(el.querySelector('header')?.textContent).toContain('Curazi');
    expect(el.querySelector('header')?.textContent).toContain(
      'Descubra quanto você economiza com energia solar em Maceió',
    );
  });

  it('exibe as três seções na ordem do fluxo', () => {
    const titulos = Array.from(render().querySelectorAll('section h2')).map((h) =>
      h.textContent?.trim(),
    );
    expect(titulos).toEqual([
      '1. Aponte o telhado do imóvel em Maceió',
      '2. Conta de energia',
      '3. Resultados',
    ]);
  });

  it('exibe o footer com o aviso de estimativa', () => {
    expect(render().querySelector('footer')?.textContent).toContain(
      'Simulação estimativa. Consulte um profissional para projeto definitivo.',
    );
  });

  describe('botão "Simular economia"', () => {
    function criarPagina() {
      const fixture = TestBed.createComponent(SimuladorPageComponent);
      fixture.detectChanges();
      const pagina = fixture.componentInstance;
      const botao = (): HTMLButtonElement =>
        Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
          (b as HTMLButtonElement).textContent?.includes('Simular economia'),
        ) as HTMLButtonElement;
      return { fixture, pagina, botao };
    }

    it('desabilita sem coordenada, sem valor válido ou durante o carregamento', () => {
      const { fixture, pagina, botao } = criarPagina();

      // Sem coordenada (valor ok)
      pagina.valorConta.set(500);
      fixture.detectChanges();
      expect(botao().disabled).toBeTrue();

      // Coordenada + valor → habilita
      pagina.coordenada.set({ lat: -9.66, lng: -35.7 });
      fixture.detectChanges();
      expect(botao().disabled).toBeFalse();

      // Valor inválido → desabilita
      pagina.valorConta.set(null);
      fixture.detectChanges();
      expect(botao().disabled).toBeTrue();

      // Carregando → desabilita
      pagina.valorConta.set(500);
      pagina.carregando.set(true);
      fixture.detectChanges();
      expect(botao().disabled).toBeTrue();
    });

    it('exibe o spinner dentro do botão durante o carregamento', () => {
      const { fixture, pagina, botao } = criarPagina();

      expect(botao().querySelector('mat-progress-spinner')).toBeNull();
      pagina.carregando.set(true);
      fixture.detectChanges();
      expect(botao().querySelector('mat-progress-spinner')).not.toBeNull();
    });

    it('monta o SimulacaoRequest com coordenada, valor e avançados preenchidos', () => {
      const { fixture, pagina } = criarPagina();
      const logSpy = spyOn(console, 'log');

      pagina.coordenada.set({ lat: -9.649849, lng: -35.708949 });
      pagina.valorConta.set(500);
      const painel = fixture.debugElement.query(
        (el) => el.name === 'app-painel-avancado',
      ).componentInstance;
      painel.form.patchValue({ percentualAutoconsumo: 30, tipoLigacao: 'TRIFASICO' });
      fixture.detectChanges();

      pagina.simular();

      expect(logSpy).toHaveBeenCalledWith('SimulacaoRequest', {
        latitude: -9.649849,
        longitude: -35.708949,
        valorContaMensal: 500,
        parametrosAvancados: { percentualAutoconsumo: 0.3, tipoLigacao: 'TRIFASICO' },
      });
    });

    it('omite parametrosAvancados quando o painel está todo em branco', () => {
      const { fixture, pagina } = criarPagina();
      const logSpy = spyOn(console, 'log');

      pagina.coordenada.set({ lat: -9.66, lng: -35.7 });
      pagina.valorConta.set(1234.56);
      fixture.detectChanges();

      pagina.simular();

      expect(logSpy).toHaveBeenCalledWith('SimulacaoRequest', {
        latitude: -9.66,
        longitude: -35.7,
        valorContaMensal: 1234.56,
      });
    });
  });
});
