import { Pipe, PipeTransform } from '@angular/core';

/**
 * Meses → "2 anos e 10 meses". null/undefined significa que o investimento não
 * se paga no horizonte simulado → "acima de 25 anos".
 */
@Pipe({ name: 'payback' })
export class PaybackPipe implements PipeTransform {
  transform(meses: number | null | undefined): string {
    if (meses === null || meses === undefined) {
      return 'acima de 25 anos';
    }
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    const partes: string[] = [];
    if (anos > 0) {
      partes.push(anos === 1 ? '1 ano' : `${anos} anos`);
    }
    if (mesesRestantes > 0) {
      partes.push(mesesRestantes === 1 ? '1 mês' : `${mesesRestantes} meses`);
    }
    return partes.length > 0 ? partes.join(' e ') : '0 meses';
  }
}
