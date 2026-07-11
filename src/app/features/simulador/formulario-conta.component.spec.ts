import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { FormularioContaComponent } from './formulario-conta.component';

describe('FormularioContaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioContaComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function criar() {
    const fixture = TestBed.createComponent(FormularioContaComponent);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance };
  }

  it('valida required, min 50 e max 50000', () => {
    const { componente } = criar();
    const controle = componente.controle;

    expect(controle.hasError('required')).toBeTrue();

    controle.setValue(49.99);
    expect(controle.hasError('min')).toBeTrue();

    controle.setValue(50000.01);
    expect(controle.hasError('max')).toBeTrue();

    controle.setValue(500);
    expect(controle.valid).toBeTrue();
  });

  it('emite o valor quando válido e null quando inválido', () => {
    const { componente } = criar();
    const emitidos: (number | null)[] = [];
    componente.valorConta.subscribe((v) => emitidos.push(v));

    componente.controle.setValue(500);
    componente.controle.setValue(30);
    componente.controle.setValue(1234.56);

    expect(emitidos).toEqual([500, null, 1234.56]);
  });

  it('exibe a mensagem de erro específica de cada validação', () => {
    const { fixture, componente } = criar();
    const texto = () => {
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('mat-error')?.textContent ?? '';
    };

    componente.controle.markAsTouched();
    expect(texto()).toContain('Informe o valor médio mensal da conta.');

    componente.controle.setValue(10);
    expect(texto()).toContain('O valor mínimo para simulação é R$ 50,00.');

    componente.controle.setValue(60000);
    expect(texto()).toContain('O valor máximo para simulação é R$ 50.000,00.');
  });
});
