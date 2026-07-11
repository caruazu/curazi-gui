// O locale pt-BR é registrado como efeito colateral do app.config
// (registerLocaleData). Importá-lo aqui garante que o teste cobre o registro real.
import '../app.config';

import { CurrencyPipe, DecimalPipe } from '@angular/common';

// CLDR usa espaço não separável entre "R$" e o valor.
const normalizar = (s: string | null) => s?.replace(/ /g, ' ');

describe('Formatação pt-BR', () => {
  describe('CurrencyPipe (moeda BRL)', () => {
    const pipe = new CurrencyPipe('pt-BR', 'BRL');

    it('formata inteiros com milhar "." e decimal ","', () => {
      expect(normalizar(pipe.transform(15400))).toBe('R$ 15.400,00');
    });

    it('formata centavos', () => {
      expect(normalizar(pipe.transform(0.94))).toBe('R$ 0,94');
    });

    it('formata valores negativos (fluxo de caixa do ano 0)', () => {
      expect(normalizar(pipe.transform(-15400))).toBe('-R$ 15.400,00');
    });

    it('formata valores grandes (economia em 25 anos)', () => {
      expect(normalizar(pipe.transform(187000))).toBe('R$ 187.000,00');
    });
  });

  describe('DecimalPipe (números)', () => {
    const pipe = new DecimalPipe('pt-BR');

    it('usa separadores brasileiros', () => {
      expect(pipe.transform(1234.5, '1.1-1')).toBe('1.234,5');
    });

    it('formata área e potência com 1–2 casas', () => {
      expect(pipe.transform(17.3, '1.1-1')).toBe('17,3');
      expect(pipe.transform(4.4, '1.2-2')).toBe('4,40');
    });
  });
});
