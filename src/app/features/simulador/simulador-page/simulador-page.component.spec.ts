import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import {
  ErroSimulacao,
  SimulacaoService,
  SlugErroSimulacao,
} from '../../../core/api/simulacao.service';
import { GoogleMapsLoaderService } from '../../../core/maps/google-maps-loader.service';
import { respostaSimulacaoMock } from '../../../testing/simulacao-response.mock';
import { MapaLocalizacaoComponent } from '../mapa-localizacao/mapa-localizacao.component';
import { PainelAvancadoComponent } from '../painel-avancado/painel-avancado.component';
import { SimuladorPageComponent } from './simulador-page.component';

registerLocaleData(localePt, 'pt-BR');

describe('SimuladorPageComponent', () => {
  let servico: jasmine.SpyObj<SimulacaoService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let acaoSnackBar: Subject<void>;

  beforeEach(async () => {
    servico = jasmine.createSpyObj('SimulacaoService', ['simular']);
    servico.simular.and.returnValue(of(respostaSimulacaoMock()));
    acaoSnackBar = new Subject<void>();
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    snackBar.open.and.returnValue({
      onAction: () => acaoSnackBar.asObservable(),
    } as ReturnType<MatSnackBar['open']>);

    await TestBed.configureTestingModule({
      imports: [SimuladorPageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
        { provide: SimulacaoService, useValue: servico },
        { provide: MatSnackBar, useValue: snackBar },
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

  function criarPagina() {
    const fixture = TestBed.createComponent(SimuladorPageComponent);
    fixture.detectChanges();
    const pagina = fixture.componentInstance;
    const botaoSimular = (): HTMLButtonElement =>
      Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
        (b as HTMLButtonElement).textContent?.includes('Simular economia'),
      ) as HTMLButtonElement;
    // CLDR usa espaços não separáveis (U+00A0/U+202F) entre "R$" e o valor.
    const texto = () =>
      (fixture.nativeElement.textContent as string).replace(/[  ]/g, ' ');
    return { fixture, pagina, botaoSimular, texto };
  }

  /** Deixa a página pronta para simular e clica no botão. */
  function simular(pronto: ReturnType<typeof criarPagina>) {
    pronto.pagina.coordenada.set({ lat: -9.649849, lng: -35.708949 });
    pronto.pagina.valorConta.set(500);
    pronto.fixture.detectChanges();
    pronto.botaoSimular().click();
    pronto.fixture.detectChanges();
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
    it('desabilita sem coordenada, sem valor válido ou durante o carregamento', () => {
      const { fixture, pagina, botaoSimular } = criarPagina();

      pagina.valorConta.set(500);
      fixture.detectChanges();
      expect(botaoSimular().disabled).toBeTrue();

      pagina.coordenada.set({ lat: -9.66, lng: -35.7 });
      fixture.detectChanges();
      expect(botaoSimular().disabled).toBeFalse();

      pagina.valorConta.set(null);
      fixture.detectChanges();
      expect(botaoSimular().disabled).toBeTrue();

      pagina.valorConta.set(500);
      pagina.carregando.set(true);
      fixture.detectChanges();
      expect(botaoSimular().disabled).toBeTrue();
    });

    it('exibe o spinner dentro do botão durante o carregamento', () => {
      const { fixture, pagina, botaoSimular } = criarPagina();

      expect(botaoSimular().querySelector('mat-progress-spinner')).toBeNull();
      pagina.carregando.set(true);
      fixture.detectChanges();
      expect(botaoSimular().querySelector('mat-progress-spinner')).not.toBeNull();
    });

    it('exibe a barra de progresso na seção 3 enquanto carrega', () => {
      const { fixture, pagina } = criarPagina();

      expect(fixture.nativeElement.querySelector('#resultados mat-progress-bar')).toBeNull();
      pagina.carregando.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#resultados mat-progress-bar')).not.toBeNull();
    });
  });

  describe('fluxo de sucesso', () => {
    it('envia o SimulacaoRequest com os avançados preenchidos e omite quando em branco', () => {
      const pronto = criarPagina();
      const painel = pronto.fixture.debugElement
        .query((el) => el.name === 'app-painel-avancado')
        .componentInstance as PainelAvancadoComponent;
      painel.form.patchValue({ percentualAutoconsumo: 30, tipoLigacao: 'TRIFASICO' });

      simular(pronto);

      expect(servico.simular).toHaveBeenCalledWith({
        latitude: -9.649849,
        longitude: -35.708949,
        valorContaMensal: 500,
        parametrosAvancados: { percentualAutoconsumo: 0.3, tipoLigacao: 'TRIFASICO' },
      });
    });

    it('exibe cards, gráfico e atribuições na seção 3 e rola até ela', () => {
      const rolagem = spyOn(HTMLElement.prototype, 'scrollIntoView');
      const pronto = criarPagina();

      simular(pronto);

      expect(pronto.pagina.resultado()).toEqual(respostaSimulacaoMock());
      expect(pronto.pagina.carregando()).toBeFalse();
      expect(pronto.texto()).toContain('R$ 15.400,00');
      expect(pronto.texto()).toContain('3 anos e 5 meses');
      expect(pronto.texto()).toContain('Análise de telhado: Google Solar API');
      expect(
        pronto.fixture.nativeElement.querySelector('app-grafico-fluxo-caixa canvas'),
      ).not.toBeNull();
      expect(rolagem).toHaveBeenCalled();
      // Foco programático na seção de resultados (leitores de tela).
      expect(document.activeElement?.id).toBe('resultados');
    });

    it('pré-preenche o painel avançado com os parametrosUtilizados da resposta', () => {
      const pronto = criarPagina();
      const painel = pronto.fixture.debugElement
        .query((el) => el.name === 'app-painel-avancado')
        .componentInstance as PainelAvancadoComponent;

      simular(pronto);

      const valores = painel.form.getRawValue();
      expect(valores.percentualAutoconsumo).toBeCloseTo(30, 6);
      expect(valores.custoPorKwpInstalado).toBe(3500);
      expect(valores.tipoLigacao).toBe('BIFASICO');
    });

    it('"Refazer simulação" limpa resultado e erro mantendo pino e valor', () => {
      const pronto = criarPagina();
      simular(pronto);

      const refazer = Array.from(
        pronto.fixture.nativeElement.querySelectorAll('button'),
      ).find((b) => (b as HTMLButtonElement).textContent?.includes('Refazer simulação'));
      (refazer as HTMLButtonElement).click();
      pronto.fixture.detectChanges();

      expect(pronto.pagina.resultado()).toBeNull();
      expect(pronto.pagina.erro()).toBeNull();
      expect(pronto.pagina.coordenada()).toEqual({ lat: -9.649849, lng: -35.708949 });
      expect(pronto.pagina.valorConta()).toBe(500);
      expect(pronto.texto()).toContain('Posicione o pino, informe a conta');
    });
  });

  describe('geometria no mapa', () => {
    function espiarMapa(pronto: ReturnType<typeof criarPagina>) {
      const mapa = pronto.fixture.debugElement.query((el) => el.name === 'app-mapa-localizacao')
        .componentInstance as MapaLocalizacaoComponent;
      return {
        desenhar: spyOn(mapa, 'desenharGeometria'),
        enquadrar: spyOn(mapa, 'enquadrar'),
        limpar: spyOn(mapa, 'limparGeometria'),
      };
    }

    it('sucesso desenha a geometria e enquadra o edifício com fitBounds', () => {
      const pronto = criarPagina();
      const mapa = espiarMapa(pronto);

      simular(pronto);

      const geometria = respostaSimulacaoMock().geometria!;
      expect(mapa.desenhar).toHaveBeenCalledWith(geometria);
      expect(mapa.enquadrar).toHaveBeenCalledWith(geometria.boundingBoxEdificio!);
    });

    it('resposta sem geometria não desenha nada e não quebra', () => {
      const semGeometria = { ...respostaSimulacaoMock(), geometria: null };
      servico.simular.and.returnValue(of(semGeometria));
      const pronto = criarPagina();
      const mapa = espiarMapa(pronto);

      simular(pronto);

      expect(pronto.pagina.resultado()).toEqual(semGeometria);
      expect(mapa.desenhar).not.toHaveBeenCalled();
      expect(mapa.enquadrar).not.toHaveBeenCalled();
    });

    it('geometria sem boundingBoxEdificio desenha mas não enquadra', () => {
      const resposta = respostaSimulacaoMock();
      resposta.geometria!.boundingBoxEdificio = null;
      servico.simular.and.returnValue(of(resposta));
      const pronto = criarPagina();
      const mapa = espiarMapa(pronto);

      simular(pronto);

      expect(mapa.desenhar).toHaveBeenCalled();
      expect(mapa.enquadrar).not.toHaveBeenCalled();
    });

    it('novo ponto no mapa limpa a geometria da simulação anterior', () => {
      const pronto = criarPagina();
      const mapa = espiarMapa(pronto);
      simular(pronto);

      pronto.pagina.aoEscolherCoordenada({ lat: -9.66, lng: -35.7 });

      expect(mapa.limpar).toHaveBeenCalled();
      expect(pronto.pagina.coordenada()).toEqual({ lat: -9.66, lng: -35.7 });
    });

    it('"Refazer simulação" limpa a geometria', () => {
      const pronto = criarPagina();
      const mapa = espiarMapa(pronto);
      simular(pronto);

      pronto.pagina.refazerSimulacao();

      expect(mapa.limpar).toHaveBeenCalled();
    });
  });

  describe('fluxos de erro', () => {
    function simularErro(slug: SlugErroSimulacao, mensagem: string) {
      servico.simular.and.returnValue(throwError(() => new ErroSimulacao(slug, mensagem)));
      const pronto = criarPagina();
      simular(pronto);
      return pronto;
    }

    it('erro de negócio (422) vira banner inline com role=alert na seção 2', () => {
      const pronto = simularErro('fora-da-area-atendida', 'No momento atendemos apenas Maceió-AL.');

      const banner = pronto.fixture.nativeElement.querySelector('#conta [role="alert"]');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('No momento atendemos apenas Maceió-AL.');
      expect(snackBar.open).not.toHaveBeenCalled();
      expect(pronto.pagina.carregando()).toBeFalse();
    });

    it('conta-abaixo-do-minimo também vira banner', () => {
      const pronto = simularErro('conta-abaixo-do-minimo', 'Informe um valor acima de R$ 96,00.');
      expect(
        pronto.fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
      ).toContain('Informe um valor acima de R$ 96,00.');
    });

    it('503 vira MatSnackBar com "Tentar de novo" que reexecuta a última simulação', () => {
      const mensagem = 'Serviço de análise temporariamente indisponível. Tente de novo em instantes.';
      const pronto = simularErro('servico-solar-indisponivel', mensagem);

      expect(snackBar.open).toHaveBeenCalledWith(mensagem, 'Tentar de novo', { duration: 8000 });
      expect(pronto.fixture.nativeElement.querySelector('#conta [role="alert"]')).toBeNull();
      expect(servico.simular).toHaveBeenCalledTimes(1);

      acaoSnackBar.next();
      expect(servico.simular).toHaveBeenCalledTimes(2);
      expect(servico.simular.calls.mostRecent().args[0]).toEqual(
        servico.simular.calls.first().args[0],
      );
    });

    it('falha de rede também vira MatSnackBar com retry', () => {
      const pronto = simularErro('falha-de-rede', 'Sem conexão com o servidor. Verifique sua internet.');

      expect(snackBar.open).toHaveBeenCalledWith(
        'Sem conexão com o servidor. Verifique sua internet.',
        'Tentar de novo',
        { duration: 8000 },
      );
      expect(pronto.fixture.nativeElement.querySelector('#conta [role="alert"]')).toBeNull();
    });

    it('nova simulação com sucesso limpa o banner de erro', () => {
      const pronto = simularErro('fora-da-area-atendida', 'No momento atendemos apenas Maceió-AL.');
      expect(pronto.pagina.erro()).not.toBeNull();

      servico.simular.and.returnValue(of(respostaSimulacaoMock()));
      simular(pronto);

      expect(pronto.pagina.erro()).toBeNull();
      expect(pronto.fixture.nativeElement.querySelector('#conta [role="alert"]')).toBeNull();
    });
  });
});
