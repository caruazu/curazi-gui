// Funções PURAS de geometria para desenhar o bloco `geometria` do contrato
// sobre o mapa. Não dependem do Google Maps — testáveis em isolamento.

import { BoundingBoxGeo, OrientacaoPainel, PontoGeo } from '../api/simulacao.models';

/** Comprimento aproximado de 1 grau de latitude, em metros. */
const METROS_POR_GRAU_LAT = 111_320;

const RAD_POR_GRAU = Math.PI / 180;

/**
 * Converte um deslocamento em metros (leste/norte) para graus de lng/lat na
 * latitude de referência: dLat = m/111320; dLng = m/(111320·cos(lat)).
 */
export function metrosParaGraus(
  lesteMetros: number,
  norteMetros: number,
  latReferencia: number,
): { dLat: number; dLng: number } {
  return {
    dLat: norteMetros / METROS_POR_GRAU_LAT,
    dLng: lesteMetros / (METROS_POR_GRAU_LAT * Math.cos(latReferencia * RAD_POR_GRAU)),
  };
}

/**
 * Os 4 vértices lat/lng do retângulo de um painel visto de cima (satélite).
 *
 * Modelo: o eixo "descida do telhado" aponta na direção do azimute do segmento
 * (0° = norte, sentido horário). A dimensão do painel alinhada a esse eixo
 * (altura em RETRATO, largura em PAISAGEM) é encurtada por cos(inclinacaoGraus)
 * — projeção do plano inclinado na vista de satélite; a dimensão perpendicular
 * não encurta. O retângulo é rotacionado pelo azimute em torno do centro.
 */
export function cantosDoPainel(
  centro: PontoGeo,
  alturaM: number,
  larguraM: number,
  orientacao: OrientacaoPainel,
  azimuteGraus: number,
  inclinacaoGraus: number,
): PontoGeo[] {
  const aoLongoDaDescida =
    (orientacao === 'RETRATO' ? alturaM : larguraM) * Math.cos(inclinacaoGraus * RAD_POR_GRAU);
  const transversal = orientacao === 'RETRATO' ? larguraM : alturaM;

  // Vetores unitários em metros (leste, norte): u = eixo de descida no azimute;
  // v = perpendicular (90° horário de u).
  const uLeste = Math.sin(azimuteGraus * RAD_POR_GRAU);
  const uNorte = Math.cos(azimuteGraus * RAD_POR_GRAU);
  const vLeste = uNorte;
  const vNorte = -uLeste;

  const meioU = aoLongoDaDescida / 2;
  const meioV = transversal / 2;
  // Perímetro do retângulo em ordem (sem auto-interseção).
  const cantosLocais: [number, number][] = [
    [+meioU, +meioV],
    [+meioU, -meioV],
    [-meioU, -meioV],
    [-meioU, +meioV],
  ];

  return cantosLocais.map(([u, v]) => {
    const leste = u * uLeste + v * vLeste;
    const norte = u * uNorte + v * vNorte;
    const { dLat, dLng } = metrosParaGraus(leste, norte, centro.lat);
    return { lat: centro.lat + dLat, lng: centro.lng + dLng };
  });
}

/** Os 4 vértices do retângulo de um bounding box, na ordem sw → se → ne → nw. */
export function retanguloDeBoundingBox(sw: PontoGeo, ne: PontoGeo): PontoGeo[] {
  return [
    { lat: sw.lat, lng: sw.lng },
    { lat: sw.lat, lng: ne.lng },
    { lat: ne.lat, lng: ne.lng },
    { lat: ne.lat, lng: sw.lng },
  ];
}

/** Expande um bounding box em torno do próprio centro, multiplicando os meios-vãos por `fator`. */
export function expandirBoundingBox(bb: BoundingBoxGeo, fator: number): BoundingBoxGeo {
  const centroLat = (bb.sw.lat + bb.ne.lat) / 2;
  const centroLng = (bb.sw.lng + bb.ne.lng) / 2;
  const meioLat = ((bb.ne.lat - bb.sw.lat) / 2) * fator;
  const meioLng = ((bb.ne.lng - bb.sw.lng) / 2) * fator;
  return {
    sw: { lat: centroLat - meioLat, lng: centroLng - meioLng },
    ne: { lat: centroLat + meioLat, lng: centroLng + meioLng },
  };
}
