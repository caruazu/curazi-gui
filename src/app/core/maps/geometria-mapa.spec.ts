import { PontoGeo } from '../api/simulacao.models';
import {
  cantosDoPainel,
  expandirBoundingBox,
  metrosParaGraus,
  retanguloDeBoundingBox,
} from './geometria-mapa';

/** 1 grau de latitude em metros — mesma constante das funções. */
const M_LAT = 111_320;

/** Compara vértices como conjunto (a ordem do perímetro não importa nos testes). */
function expectMesmosVertices(recebidos: PontoGeo[], esperados: PontoGeo[]): void {
  expect(recebidos.length).toBe(esperados.length);
  for (const esperado of esperados) {
    const encontrado = recebidos.some(
      (v) => Math.abs(v.lat - esperado.lat) < 1e-12 && Math.abs(v.lng - esperado.lng) < 1e-12,
    );
    expect(encontrado)
      .withContext(`vértice esperado ${JSON.stringify(esperado)} em ${JSON.stringify(recebidos)}`)
      .toBeTrue();
  }
}

describe('metrosParaGraus', () => {
  it('no equador, 111320 m = 1 grau em ambos os eixos', () => {
    const { dLat, dLng } = metrosParaGraus(M_LAT, M_LAT, 0);
    expect(dLat).toBeCloseTo(1, 10);
    expect(dLng).toBeCloseTo(1, 10);
  });

  it('a 60° de latitude (cos = 0,5), a mesma distância leste vale o dobro em graus de lng', () => {
    const { dLat, dLng } = metrosParaGraus(M_LAT, M_LAT, 60);
    expect(dLat).toBeCloseTo(1, 10);
    expect(dLng).toBeCloseTo(2, 10);
  });

  it('deslocamentos negativos produzem graus negativos', () => {
    const { dLat, dLng } = metrosParaGraus(-M_LAT, -M_LAT / 2, 0);
    expect(dLat).toBeCloseTo(-0.5, 10);
    expect(dLng).toBeCloseTo(-1, 10);
  });
});

describe('cantosDoPainel', () => {
  // Centro no equador para 1 m = 1/111320 grau nos dois eixos — verificável à mão.
  const centro: PontoGeo = { lat: 0, lng: 0 };
  const mLat = (m: number) => m / M_LAT;

  it('azimute 0, inclinação 0, RETRATO: altura (2 m) no eixo norte-sul, largura (1 m) no leste-oeste', () => {
    const cantos = cantosDoPainel(centro, 2, 1, 'RETRATO', 0, 0);
    // Meia-altura 1 m para norte/sul, meia-largura 0,5 m para leste/oeste.
    expectMesmosVertices(cantos, [
      { lat: mLat(1), lng: mLat(0.5) },
      { lat: mLat(1), lng: mLat(-0.5) },
      { lat: mLat(-1), lng: mLat(-0.5) },
      { lat: mLat(-1), lng: mLat(0.5) },
    ]);
  });

  it('azimute 0, inclinação 0, PAISAGEM: os eixos trocam (largura no norte-sul, altura no leste-oeste)', () => {
    const cantos = cantosDoPainel(centro, 2, 1, 'PAISAGEM', 0, 0);
    expectMesmosVertices(cantos, [
      { lat: mLat(0.5), lng: mLat(1) },
      { lat: mLat(0.5), lng: mLat(-1) },
      { lat: mLat(-0.5), lng: mLat(-1) },
      { lat: mLat(-0.5), lng: mLat(1) },
    ]);
  });

  it('azimute 90, inclinação 0, RETRATO: mesmo retângulo do RETRATO azimute 0 girado 90° (altura no leste-oeste)', () => {
    const cantos = cantosDoPainel(centro, 2, 1, 'RETRATO', 90, 0);
    expectMesmosVertices(cantos, [
      { lat: mLat(0.5), lng: mLat(1) },
      { lat: mLat(0.5), lng: mLat(-1) },
      { lat: mLat(-0.5), lng: mLat(-1) },
      { lat: mLat(-0.5), lng: mLat(1) },
    ]);
  });

  it('inclinação 60° (cos = 0,5) em RETRATO azimute 0 encurta a altura pela metade; largura intacta', () => {
    const cantos = cantosDoPainel(centro, 2, 1, 'RETRATO', 0, 60);
    // Altura projetada: 2 · cos(60°) = 1 m → meia-altura 0,5 m no norte-sul.
    expectMesmosVertices(cantos, [
      { lat: mLat(0.5), lng: mLat(0.5) },
      { lat: mLat(0.5), lng: mLat(-0.5) },
      { lat: mLat(-0.5), lng: mLat(-0.5) },
      { lat: mLat(-0.5), lng: mLat(0.5) },
    ]);
  });

  it('inclinação 60° em PAISAGEM azimute 0 encurta a LARGURA (eixo da descida); altura intacta', () => {
    const cantos = cantosDoPainel(centro, 2, 1, 'PAISAGEM', 0, 60);
    // Largura projetada: 1 · cos(60°) = 0,5 m no norte-sul; altura 2 m no leste-oeste.
    expectMesmosVertices(cantos, [
      { lat: mLat(0.25), lng: mLat(1) },
      { lat: mLat(0.25), lng: mLat(-1) },
      { lat: mLat(-0.25), lng: mLat(-1) },
      { lat: mLat(-0.25), lng: mLat(1) },
    ]);
  });

  it('mantém o retângulo centrado no centro informado (fora do equador)', () => {
    const outroCentro: PontoGeo = { lat: -9.6499, lng: -35.7089 };
    const cantos = cantosDoPainel(outroCentro, 1.879, 1.045, 'PAISAGEM', 94.4, 2.36);
    const mediaLat = cantos.reduce((soma, v) => soma + v.lat, 0) / 4;
    const mediaLng = cantos.reduce((soma, v) => soma + v.lng, 0) / 4;
    expect(mediaLat).toBeCloseTo(outroCentro.lat, 10);
    expect(mediaLng).toBeCloseTo(outroCentro.lng, 10);
  });
});

describe('retanguloDeBoundingBox', () => {
  it('retorna os 4 cantos na ordem sw → se → ne → nw', () => {
    const sw: PontoGeo = { lat: -9.65, lng: -35.71 };
    const ne: PontoGeo = { lat: -9.64, lng: -35.7 };
    expect(retanguloDeBoundingBox(sw, ne)).toEqual([
      { lat: -9.65, lng: -35.71 },
      { lat: -9.65, lng: -35.7 },
      { lat: -9.64, lng: -35.7 },
      { lat: -9.64, lng: -35.71 },
    ]);
  });
});

describe('expandirBoundingBox', () => {
  it('multiplica os vãos pelo fator mantendo o centro', () => {
    // Box 0,2 × 0,1 grau centrado em (1, 2); fator 3 → 0,6 × 0,3 no mesmo centro.
    const expandido = expandirBoundingBox(
      { sw: { lat: 0.9, lng: 1.95 }, ne: { lat: 1.1, lng: 2.05 } },
      3,
    );
    expect(expandido.sw.lat).toBeCloseTo(0.7, 10);
    expect(expandido.ne.lat).toBeCloseTo(1.3, 10);
    expect(expandido.sw.lng).toBeCloseTo(1.85, 10);
    expect(expandido.ne.lng).toBeCloseTo(2.15, 10);
  });

  it('fator 1 devolve o mesmo box', () => {
    const bb = { sw: { lat: -9.65, lng: -35.71 }, ne: { lat: -9.64, lng: -35.7 } };
    const igual = expandirBoundingBox(bb, 1);
    expect(igual.sw.lat).toBeCloseTo(bb.sw.lat, 10);
    expect(igual.sw.lng).toBeCloseTo(bb.sw.lng, 10);
    expect(igual.ne.lat).toBeCloseTo(bb.ne.lat, 10);
    expect(igual.ne.lng).toBeCloseTo(bb.ne.lng, 10);
  });
});
