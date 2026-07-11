import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ProblemDetail,
  SimulacaoRequest,
  SimulacaoResponse,
  SlugErroApi,
} from './simulacao.models';

export type SlugErroSimulacao = SlugErroApi | 'falha-de-rede' | 'erro-desconhecido';

/** Erro já traduzido para exibição ao usuário (mensagens da skill ux-curazi). */
export class ErroSimulacao extends Error {
  constructor(
    readonly slug: SlugErroSimulacao,
    readonly mensagemUsuario: string,
    readonly problem?: ProblemDetail,
  ) {
    super(mensagemUsuario);
    this.name = 'ErroSimulacao';
  }
}

const MENSAGENS: Partial<Record<SlugErroSimulacao, string>> = {
  'fora-da-area-atendida': 'No momento atendemos apenas Maceió-AL.',
  'edificio-nao-encontrado': 'Não encontramos uma edificação nesse ponto. Clique sobre um telhado.',
  'servico-solar-indisponivel':
    'Serviço de análise temporariamente indisponível. Tente de novo em instantes.',
  'falha-de-rede': 'Sem conexão com o servidor. Verifique sua internet.',
  'erro-desconhecido': 'Ocorreu um erro inesperado. Tente novamente.',
};

@Injectable({ providedIn: 'root' })
export class SimulacaoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  simular(request: SimulacaoRequest): Observable<SimulacaoResponse> {
    return this.http
      .post<SimulacaoResponse>(`${this.baseUrl}/api/v1/simulacoes`, request)
      .pipe(catchError((erro: HttpErrorResponse) => throwError(() => this.traduzirErro(erro))));
  }

  private traduzirErro(erro: HttpErrorResponse): ErroSimulacao {
    if (erro.status === 0) {
      return new ErroSimulacao('falha-de-rede', MENSAGENS['falha-de-rede']!);
    }

    const problem = this.extrairProblem(erro.error);
    const slug = this.extrairSlug(problem);
    // Para estes erros a mensagem certa depende de dados que só o servidor tem
    // (valor mínimo/CIP, campo inválido) — o `detail` do Problem Details já vem em pt-BR.
    if (slug === 'conta-abaixo-do-minimo' || slug === 'parametros-invalidos') {
      return new ErroSimulacao(slug, problem?.detail || MENSAGENS['erro-desconhecido']!, problem);
    }
    return new ErroSimulacao(slug, MENSAGENS[slug] ?? MENSAGENS['erro-desconhecido']!, problem);
  }

  private extrairProblem(corpo: unknown): ProblemDetail | undefined {
    if (corpo && typeof corpo === 'object' && 'type' in corpo && 'status' in corpo) {
      return corpo as ProblemDetail;
    }
    return undefined;
  }

  private extrairSlug(problem: ProblemDetail | undefined): SlugErroSimulacao {
    const sufixo = problem?.type.split('/').pop();
    const conhecidos: SlugErroApi[] = [
      'parametros-invalidos',
      'fora-da-area-atendida',
      'edificio-nao-encontrado',
      'conta-abaixo-do-minimo',
      'servico-solar-indisponivel',
    ];
    return conhecidos.find((t) => t === sufixo) ?? 'erro-desconhecido';
  }
}
