import { SimulacaoResponse } from '../core/api/simulacao.models';

/**
 * Resposta completa e fiel a docs/contrato-api.md para uso em testes:
 * fluxoCaixa com 26 itens (ano 0 a 25), geometria com paineis.length =
 * quantidadeModulos e todos os campos presentes.
 */
export function respostaSimulacaoMock(): SimulacaoResponse {
  const fluxoCaixa = Array.from({ length: 26 }, (_, ano) => ({
    ano,
    fluxo: ano === 0 ? -15400 : 5514,
    acumuladoNominal: -15400 + 5514 * ano,
    acumuladoDescontado: -15400 + 4500 * ano,
  }));
  // 8 painéis (= quantidadeModulos) em duas fileiras dentro do segmento.
  const paineis = Array.from({ length: 8 }, (_, i) => ({
    centro: {
      lat: -9.649995 + Math.floor(i / 4) * 0.00002,
      lng: -35.708940 + (i % 4) * 0.00002,
    },
    orientacao: 'PAISAGEM' as const,
    indiceSegmento: 0,
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
    geometria: {
      boundingBoxEdificio: {
        sw: { lat: -9.650046, lng: -35.708953 },
        ne: { lat: -9.649908, lng: -35.708864 },
      },
      segmentosTelhado: [
        {
          boundingBox: {
            sw: { lat: -9.650035, lng: -35.708947 },
            ne: { lat: -9.649924, lng: -35.708864 },
          },
          centro: { lat: -9.64998, lng: -35.708906 },
          azimuteGraus: 94.42892,
          inclinacaoGraus: 2.355578,
        },
      ],
      paineis,
      painelAlturaMetros: 1.879,
      painelLarguraMetros: 1.045,
    },
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
