import { MoedaCompactaPipe, formatarMoedaCompacta } from './moeda-compacta.pipe';

describe('formatarMoedaCompacta', () => {
  it('formata milhares como "mil" com até 1 casa', () => {
    expect(formatarMoedaCompacta(15400)).toBe('R$ 15,4 mil');
    expect(formatarMoedaCompacta(15000)).toBe('R$ 15 mil');
    expect(formatarMoedaCompacta(61234)).toBe('R$ 61,2 mil');
  });

  it('formata milhões como "mi"', () => {
    expect(formatarMoedaCompacta(1_200_000)).toBe('R$ 1,2 mi');
    expect(formatarMoedaCompacta(1_000_000)).toBe('R$ 1 mi');
  });

  it('mantém valores pequenos por extenso', () => {
    expect(formatarMoedaCompacta(500)).toBe('R$ 500');
    expect(formatarMoedaCompacta(0)).toBe('R$ 0');
  });

  it('preserva o sinal de valores negativos (fluxo do ano 0)', () => {
    expect(formatarMoedaCompacta(-15400)).toBe('-R$ 15,4 mil');
  });
});

describe('MoedaCompactaPipe', () => {
  const pipe = new MoedaCompactaPipe();

  it('delega para a função de formatação', () => {
    expect(pipe.transform(187000)).toBe('R$ 187 mil');
  });

  it('retorna vazio para null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
