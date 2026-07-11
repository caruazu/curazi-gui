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
