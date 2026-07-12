import { SimulacaoResponse } from '../core/api/simulacao.models';

/**
 * Resposta completa e fiel a docs/contrato-api.md para uso em testes:
 * fluxoCaixa com 26 itens (ano 0 a 25) e todos os campos presentes.
 */
export function respostaSimulacaoMock(): SimulacaoResponse {
  const fluxoCaixa = Array.from({ length: 26 }, (_, ano) => ({
    ano,
    fluxo: ano === 0 ? -15400 : 5514,
    acumuladoNominal: -15400 + 5514 * ano,
    acumuladoDescontado: -15400 + 4500 * ano,
  }));
  return {
    consumoMensalEstimadoKwh: 500,
    potenciaKitKwp: 4.4,
    quantidadeModulos: 8,
    areaNecessariaM2: 17.3,
    producaoMensalKwh: 531,
    atendimentoParcial: false,
    custoImplantacao: 15400,
    economiaAnualAno1: 5514,
    paybackSimplesMeses: 34,
    paybackDescontadoMeses: 41,
    vpl25Anos: 61234,
    economiaTotal25Anos: 187000,
    fluxoCaixa,
    qualidadeImagem: 'HIGH',
    dataImagem: '2024-08-01',
    fonteDados: 'Google Solar API',
    parametrosUtilizados: {
      precoKwhComImpostos: 0.94123456,
      custoPorKwpInstalado: 3500,
      potenciaModuloWp: 550,
      percentualAutoconsumo: 0.3,
      inflacaoTarifariaAnual: 0.05,
      taxaDescontoAnual: 0.1,
      anoConexao: 2026,
      percentualFioB: 0.6,
      tipoLigacao: 'BIFASICO',
      vigenciaTarifa: '2026-05',
    },
    disclaimers: [
      'Estimativa baseada em análise do telhado por imagens (Google Solar API); não substitui visita técnica.',
      'Premissas: bandeira verde, créditos usados no ciclo, sem Tarifa Social.',
    ],
  };
}
