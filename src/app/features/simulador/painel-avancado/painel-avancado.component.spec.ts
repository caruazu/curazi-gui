import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ParametrosUtilizados } from '../../../core/api/simulacao.models';
import { PainelAvancadoComponent } from './painel-avancado.component';

describe('PainelAvancadoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PainelAvancadoComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function criar() {
    const fixture = TestBed.createComponent(PainelAvancadoComponent);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance };
  }

  it('cria colapsado com o texto de apoio', () => {
    const { fixture } = criar();
    const painel = fixture.nativeElement.querySelector('mat-expansion-panel');
    expect(painel.textContent).toContain('Parâmetros avançados');
    expect(painel.querySelector('.mat-expanded')).toBeNull();
  });

  it('montarParametros retorna undefined com tudo em branco', () => {
    const { componente } = criar();
    expect(componente.montarParametros()).toBeUndefined();
  });

  it('montarParametros omite nulls e converte percentuais 0–100 para fração 0–1', () => {
    const { componente } = criar();
    componente.form.patchValue({
      percentualAutoconsumo: 30,
      inflacaoTarifariaAnual: 5.5,
      tipoLigacao: 'TRIFASICO',
    });

    expect(componente.montarParametros()).toEqual({
      percentualAutoconsumo: 0.3,
      inflacaoTarifariaAnual: 0.055,
      tipoLigacao: 'TRIFASICO',
    });
  });

  it('montarParametros repassa campos monetários e ano sem conversão', () => {
    const { componente } = criar();
    componente.form.patchValue({
      precoKwhComImpostos: 0.94,
      custoPorKwpInstalado: 3500,
      potenciaModuloWp: 550,
      anoConexao: 2027,
    });

    expect(componente.montarParametros()).toEqual({
      precoKwhComImpostos: 0.94,
      custoPorKwpInstalado: 3500,
      potenciaModuloWp: 550,
      anoConexao: 2027,
    });
  });

  it('preencherCom preenche o form com frações convertidas para 0–100', () => {
    const { componente } = criar();
    const parametros: ParametrosUtilizados = {
      precoKwhComImpostos: 0.94123456,
      custoPorKwpInstalado: 3500,
      potenciaModuloWp: 550,
      percentualAutoconsumo: 0.3,
      inflacaoTarifariaAnual: 0.05,
      taxaDescontoAnual: 0.1,
      anoConexao: 2026,
      percentualFioB: 0.6,
      tipoLigacao: 'BIFASICO',
      vigenciaTarifa: '2026-05',
    };

    componente.preencherCom(parametros);

    const valores = componente.form.getRawValue();
    expect(valores.percentualAutoconsumo).toBeCloseTo(30, 6);
    expect(valores.inflacaoTarifariaAnual).toBeCloseTo(5, 6);
    expect(valores.taxaDescontoAnual).toBeCloseTo(10, 6);
    expect(valores.precoKwhComImpostos).toBe(0.94123456);
    expect(valores.tipoLigacao).toBe('BIFASICO');
    expect(valores.anoConexao).toBe(2026);
  });

  it('oferece anos de conexão do ano anterior ao corrente + 2', () => {
    const { componente } = criar();
    const anoAtual = new Date().getFullYear();
    expect(componente.anosConexao).toEqual([anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]);
  });
});
