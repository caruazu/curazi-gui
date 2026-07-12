// Interfaces fiéis a docs/contrato-api.md (v1). Não adicionar campos que não
// existam no contrato.

export type TipoLigacao = 'MONOFASICO' | 'BIFASICO' | 'TRIFASICO';

/** Parâmetros avançados do request; campos null ou ausentes usam os defaults do servidor. */
export interface ParametrosAvancados {
  precoKwhComImpostos?: number | null;
  custoPorKwpInstalado?: number | null;
  potenciaModuloWp?: number | null;
  percentualAutoconsumo?: number | null;
  inflacaoTarifariaAnual?: number | null;
  taxaDescontoAnual?: number | null;
  anoConexao?: number | null;
  tipoLigacao?: TipoLigacao | null;
}

/** Corpo de POST /api/v1/simulacoes. */
export interface SimulacaoRequest {
  latitude: number;
  longitude: number;
  valorContaMensal: number;
  parametrosAvancados?: ParametrosAvancados;
}

/** Item de `fluxoCaixa` — 26 itens, ano 0 a 25. */
export interface FluxoCaixaAnual {
  ano: number;
  fluxo: number;
  acumuladoNominal: number;
  acumuladoDescontado: number;
}

/** Valores efetivamente usados pelo servidor, ecoados na resposta. */
export interface ParametrosUtilizados {
  precoKwhComImpostos: number;
  custoPorKwpInstalado: number;
  potenciaModuloWp: number;
  percentualAutoconsumo: number;
  inflacaoTarifariaAnual: number;
  taxaDescontoAnual: number;
  anoConexao: number;
  percentualFioB: number;
  tipoLigacao: TipoLigacao;
  vigenciaTarifa: string;
}

/** Par lat/lng como aparece no bloco `geometria`. */
export interface PontoGeo {
  lat: number;
  lng: number;
}

/** Retângulo geográfico com cantos `sw`/`ne`. */
export interface BoundingBoxGeo {
  sw: PontoGeo;
  ne: PontoGeo;
}

export type OrientacaoPainel = 'RETRATO' | 'PAISAGEM';

/** Item de `geometria.segmentosTelhado` — um por plano do telhado. */
export interface SegmentoTelhado {
  boundingBox: BoundingBoxGeo;
  centro: PontoGeo;
  /** 0° = norte. */
  azimuteGraus: number;
  inclinacaoGraus: number;
}

/** Item de `geometria.paineis` — painel do sistema orçado. */
export interface PainelGeometria {
  centro: PontoGeo;
  orientacao: OrientacaoPainel;
  /** Posição em `segmentosTelhado`. */
  indiceSegmento: number;
}

/**
 * Geometria crua da Google Solar API para desenhar sobre o mapa — ilustrativa;
 * o backend não monta polígonos, apenas repassa lat/lng.
 */
export interface GeometriaTelhado {
  /** Pode ser `null` se a Solar API não o informar. */
  boundingBoxEdificio: BoundingBoxGeo | null;
  segmentosTelhado: SegmentoTelhado[];
  paineis: PainelGeometria[];
  /** Dimensões do painel de referência da Solar API, em metros. */
  painelAlturaMetros: number;
  painelLarguraMetros: number;
}

/** Resposta 200 de POST /api/v1/simulacoes. */
export interface SimulacaoResponse {
  consumoMensalEstimadoKwh: number;
  potenciaKitKwp: number;
  quantidadeModulos: number;
  areaNecessariaM2: number;
  producaoMensalKwh: number;
  atendimentoParcial: boolean;
  custoImplantacao: number;
  economiaAnualAno1: number;
  paybackSimplesMeses: number;
  paybackDescontadoMeses: number;
  vpl25Anos: number;
  economiaTotal25Anos: number;
  fluxoCaixa: FluxoCaixaAnual[];
  /** Ausente/`null` quando não houver geometria — nesse caso nada é desenhado. */
  geometria?: GeometriaTelhado | null;
  qualidadeImagem: string;
  /** Data da imagem de satélite (ISO `yyyy-MM-dd`) — exibir junto aos resultados. */
  dataImagem: string;
  fonteDados: string;
  parametrosUtilizados: ParametrosUtilizados;
  /** Exibir sempre junto aos resultados. */
  disclaimers: string[];
}

/** Resposta de GET /api/v1/health. */
export interface HealthResponse {
  status: string;
}

/** Slugs (sufixos de `type`) dos erros Problem Details do contrato. */
export type SlugErroApi =
  | 'parametros-invalidos'
  | 'fora-da-area-atendida'
  | 'edificio-nao-encontrado'
  | 'conta-abaixo-do-minimo'
  | 'servico-solar-indisponivel';

/** Corpo de erro Problem Details (RFC 9457). `type` é a URL cujo sufixo é um SlugErroApi. */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
}
