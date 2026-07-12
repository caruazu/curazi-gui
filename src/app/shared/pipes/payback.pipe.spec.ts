import { PaybackPipe } from './payback.pipe';

describe('PaybackPipe', () => {
  const pipe = new PaybackPipe();

  it('combina anos e meses', () => {
    expect(pipe.transform(34)).toBe('2 anos e 10 meses');
    expect(pipe.transform(41)).toBe('3 anos e 5 meses');
  });

  it('anos exatos omitem os meses', () => {
    expect(pipe.transform(12)).toBe('1 ano');
    expect(pipe.transform(24)).toBe('2 anos');
  });

  it('menos de um ano mostra só meses', () => {
    expect(pipe.transform(5)).toBe('5 meses');
    expect(pipe.transform(1)).toBe('1 mês');
    expect(pipe.transform(0)).toBe('0 meses');
  });

  it('null/undefined viram "acima de 25 anos"', () => {
    expect(pipe.transform(null)).toBe('acima de 25 anos');
    expect(pipe.transform(undefined)).toBe('acima de 25 anos');
  });
});
