import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { ErroSimulacao, SimulacaoService } from './simulacao.service';
import { SimulacaoRequest, SimulacaoResponse } from './simulacao.models';

const URL_SIMULACOES = `${environment.apiBaseUrl}/api/v1/simulacoes`;

const REQUEST: SimulacaoRequest = {
  latitude: -9.649849,
  longitude: -35.708949,
  valorContaMensal: 500.0,
};

const RESPONSE: SimulacaoResponse = {
  consumoMensalEstimadoKwh: 500,
  potenciaKitKwp: 4.4,
  quantidadeModulos: 8,
  areaNecessariaM2: 17.3,
  producaoMensalKwh: 531,
  atendimentoParcial: false,
  custoImplantacao: 15400.0,
  economiaAnualAno1: 5514.0,
  paybackSimplesMeses: 34,
  paybackDescontadoMeses: 41,
  vpl25Anos: 61234.0,
  economiaTotal25Anos: 187000.0,
  fluxoCaixa: [
    { ano: 0, fluxo: -15400.0, acumuladoNominal: -15400.0, acumuladoDescontado: -15400.0 },
    { ano: 1, fluxo: 5514.0, acumuladoNominal: -9886.0, acumuladoDescontado: -10387.0 },
  ],
  qualidadeImagem: 'HIGH',
  dataImagem: '2024-08-01',
  fonteDados: 'Google Solar API',
  parametrosUtilizados: {
    precoKwhComImpostos: 0.94123456,
    custoPorKwpInstalado: 3500.0,
    potenciaModuloWp: 550,
    percentualAutoconsumo: 0.3,
    inflacaoTarifariaAnual: 0.05,
    taxaDescontoAnual: 0.1,
    anoConexao: 2026,
    percentualFioB: 0.6,
    tipoLigacao: 'BIFASICO',
    vigenciaTarifa: '2026-05',
  },
  disclaimers: ['Estimativa baseada em análise do telhado por imagens (Google Solar API).'],
};

describe('SimulacaoService', () => {
  let service: SimulacaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SimulacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('faz POST em /api/v1/simulacoes com o corpo do contrato e retorna a resposta', () => {
    let resultado: SimulacaoResponse | undefined;
    service.simular(REQUEST).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(URL_SIMULACOES);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQUEST);
    req.flush(RESPONSE);

    expect(resultado).toEqual(RESPONSE);
  });

  function simularErro(status: number, tipo: string, detail = 'Detalhe do servidor.') {
    let erro: ErroSimulacao | undefined;
    service.simular(REQUEST).subscribe({ error: (e) => (erro = e) });
    httpMock.expectOne(URL_SIMULACOES).flush(
      {
        type: `https://curazi.com.br/erros/${tipo}`,
        title: 'Erro',
        status,
        detail,
      },
      { status, statusText: 'Erro' },
    );
    return erro!;
  }

  it('traduz 422 fora-da-area-atendida', () => {
    const erro = simularErro(422, 'fora-da-area-atendida');
    expect(erro.slug).toBe('fora-da-area-atendida');
    expect(erro.mensagemUsuario).toBe('No momento atendemos apenas Maceió-AL.');
  });

  it('traduz 422 edificio-nao-encontrado', () => {
    const erro = simularErro(422, 'edificio-nao-encontrado');
    expect(erro.slug).toBe('edificio-nao-encontrado');
    expect(erro.mensagemUsuario).toBe(
      'Não encontramos uma edificação nesse ponto. Clique sobre um telhado.',
    );
  });

  it('traduz 422 conta-abaixo-do-minimo usando o detail do servidor', () => {
    const erro = simularErro(422, 'conta-abaixo-do-minimo', 'Informe um valor acima de R$ 96,00.');
    expect(erro.slug).toBe('conta-abaixo-do-minimo');
    expect(erro.mensagemUsuario).toBe('Informe um valor acima de R$ 96,00.');
  });

  it('traduz 400 parametros-invalidos usando o detail do servidor', () => {
    const erro = simularErro(400, 'parametros-invalidos', 'latitude é obrigatória.');
    expect(erro.slug).toBe('parametros-invalidos');
    expect(erro.mensagemUsuario).toBe('latitude é obrigatória.');
  });

  it('traduz 503 servico-solar-indisponivel', () => {
    const erro = simularErro(503, 'servico-solar-indisponivel');
    expect(erro.slug).toBe('servico-solar-indisponivel');
    expect(erro.mensagemUsuario).toBe(
      'Serviço de análise temporariamente indisponível. Tente de novo em instantes.',
    );
  });

  it('traduz falha de rede (status 0)', () => {
    let erro: ErroSimulacao | undefined;
    service.simular(REQUEST).subscribe({ error: (e) => (erro = e) });
    httpMock.expectOne(URL_SIMULACOES).error(new ProgressEvent('error'), { status: 0 });

    expect(erro!.slug).toBe('falha-de-rede');
    expect(erro!.mensagemUsuario).toBe('Sem conexão com o servidor. Verifique sua internet.');
  });

  it('cai em erro-desconhecido para corpo que não é Problem Details', () => {
    let erro: ErroSimulacao | undefined;
    service.simular(REQUEST).subscribe({ error: (e) => (erro = e) });
    httpMock
      .expectOne(URL_SIMULACOES)
      .flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(erro!.slug).toBe('erro-desconhecido');
    expect(erro!.mensagemUsuario).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });
});
