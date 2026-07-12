import { Pipe, PipeTransform } from '@angular/core';

const NUMERO_COMPACTO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** "R$ 15,4 mil" / "R$ 1,2 mi" — função pura para uso fora de templates (eixo do gráfico). */
export function formatarMoedaCompacta(valor: number): string {
  const negativo = valor < 0;
  const absoluto = Math.abs(valor);
  let texto: string;
  if (absoluto >= 1_000_000) {
    texto = `R$ ${NUMERO_COMPACTO.format(absoluto / 1_000_000)} mi`;
  } else if (absoluto >= 1000) {
    texto = `R$ ${NUMERO_COMPACTO.format(absoluto / 1000)} mil`;
  } else {
    texto = `R$ ${NUMERO_COMPACTO.format(absoluto)}`;
  }
  return negativo ? `-${texto}` : texto;
}

@Pipe({ name: 'moedaCompacta' })
export class MoedaCompactaPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '' : formatarMoedaCompacta(valor);
  }
}
