import { TestBed } from '@angular/core/testing';

import { GoogleMapsLoaderService } from '../../core/maps/google-maps-loader.service';
import { SimuladorPageComponent } from './simulador-page.component';

describe('SimuladorPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimuladorPageComponent],
      providers: [
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
});
