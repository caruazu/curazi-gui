import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MoedaMaskDirective } from '../../shared/moeda-mask.directive';

/** Limites de valorContaMensal do contrato (docs/contrato-api.md). */
const VALOR_MINIMO = 50;
const VALOR_MAXIMO = 50000;

@Component({
  selector: 'app-formulario-conta',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MoedaMaskDirective],
  template: `
    <mat-form-field appearance="outline" class="campo-conta" subscriptSizing="dynamic">
      <mat-label>Valor médio mensal da conta de luz</mat-label>
      <span matTextPrefix>R$&nbsp;</span>
      <input matInput appMoedaMask [formControl]="controle" placeholder="0,00" />
      @if (controle.hasError('required')) {
        <mat-error>Informe o valor médio mensal da conta.</mat-error>
      } @else if (controle.hasError('min')) {
        <mat-error>O valor mínimo para simulação é R$ 50,00.</mat-error>
      } @else if (controle.hasError('max')) {
        <mat-error>O valor máximo para simulação é R$ 50.000,00.</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    .campo-conta {
      width: 100%;
      max-width: 360px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioContaComponent {
  readonly controle = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(VALOR_MINIMO),
    Validators.max(VALOR_MAXIMO),
  ]);

  /** Valor válido da conta, ou null enquanto vazio/inválido. */
  readonly valorConta = output<number | null>();

  constructor() {
    this.controle.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.valorConta.emit(this.controle.valid ? this.controle.value : null));
  }
}
