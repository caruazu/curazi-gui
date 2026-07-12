import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MoedaMaskDirective } from '../../../shared/directives/moeda-mask.directive';

/** Limites de valorContaMensal do contrato (docs/contrato-api.md). */
const VALOR_MINIMO = 50;
const VALOR_MAXIMO = 50000;

@Component({
  selector: 'app-formulario-conta',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MoedaMaskDirective],
  templateUrl: './formulario-conta.component.html',
  styleUrl: './formulario-conta.component.scss',
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
