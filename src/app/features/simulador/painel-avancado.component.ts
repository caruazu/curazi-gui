import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  ParametrosAvancados,
  ParametrosUtilizados,
  TipoLigacao,
} from '../../core/api/simulacao.models';

const ANO_ATUAL = new Date().getFullYear();

@Component({
  selector: 'app-painel-avancado',
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './painel-avancado.component.html',
  styleUrl: './painel-avancado.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelAvancadoComponent {
  readonly anosConexao = [ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1, ANO_ATUAL + 2];

  readonly tiposLigacao: { valor: TipoLigacao; rotulo: string }[] = [
    { valor: 'MONOFASICO', rotulo: 'Monofásico' },
    { valor: 'BIFASICO', rotulo: 'Bifásico' },
    { valor: 'TRIFASICO', rotulo: 'Trifásico' },
  ];

  // Todos opcionais: null significa "usar o padrão do sistema" (o campo é
  // omitido do request). Os campos percentuais são exibidos em 0–100 na UI
  // e convertidos para fração 0–1 no request, como exige o contrato.
  readonly form = new FormGroup({
    precoKwhComImpostos: new FormControl<number | null>(null),
    custoPorKwpInstalado: new FormControl<number | null>(null),
    potenciaModuloWp: new FormControl<number | null>(null),
    tipoLigacao: new FormControl<TipoLigacao | null>(null),
    anoConexao: new FormControl<number | null>(null),
    percentualAutoconsumo: new FormControl<number | null>(null),
    inflacaoTarifariaAnual: new FormControl<number | null>(null),
    taxaDescontoAnual: new FormControl<number | null>(null),
  });

  /**
   * Monta o `parametrosAvancados` do request: só os campos preenchidos,
   * percentuais convertidos de 0–100 (UI) para 0–1 (contrato).
   * Retorna undefined se nada foi preenchido.
   */
  montarParametros(): ParametrosAvancados | undefined {
    const valores = this.form.getRawValue();
    const parametros: ParametrosAvancados = {};
    if (valores.precoKwhComImpostos !== null) {
      parametros.precoKwhComImpostos = valores.precoKwhComImpostos;
    }
    if (valores.custoPorKwpInstalado !== null) {
      parametros.custoPorKwpInstalado = valores.custoPorKwpInstalado;
    }
    if (valores.potenciaModuloWp !== null) {
      parametros.potenciaModuloWp = valores.potenciaModuloWp;
    }
    if (valores.tipoLigacao !== null) {
      parametros.tipoLigacao = valores.tipoLigacao;
    }
    if (valores.anoConexao !== null) {
      parametros.anoConexao = valores.anoConexao;
    }
    if (valores.percentualAutoconsumo !== null) {
      parametros.percentualAutoconsumo = valores.percentualAutoconsumo / 100;
    }
    if (valores.inflacaoTarifariaAnual !== null) {
      parametros.inflacaoTarifariaAnual = valores.inflacaoTarifariaAnual / 100;
    }
    if (valores.taxaDescontoAnual !== null) {
      parametros.taxaDescontoAnual = valores.taxaDescontoAnual / 100;
    }
    return Object.keys(parametros).length > 0 ? parametros : undefined;
  }

  /**
   * Pré-preenche com os `parametrosUtilizados` ecoados pela API após a
   * simulação (frações 0–1 viram 0–100 na UI), para exibição e refinamento.
   */
  preencherCom(parametros: ParametrosUtilizados): void {
    this.form.patchValue({
      precoKwhComImpostos: parametros.precoKwhComImpostos,
      custoPorKwpInstalado: parametros.custoPorKwpInstalado,
      potenciaModuloWp: parametros.potenciaModuloWp,
      tipoLigacao: parametros.tipoLigacao,
      anoConexao: parametros.anoConexao,
      percentualAutoconsumo: parametros.percentualAutoconsumo * 100,
      inflacaoTarifariaAnual: parametros.inflacaoTarifariaAnual * 100,
      taxaDescontoAnual: parametros.taxaDescontoAnual * 100,
    });
  }
}
