# Curazi — Contrato da API REST (v1)

Este documento é compartilhado entre backend e frontend. Qualquer mudança deve ser
replicada nos dois repositórios no mesmo dia.

## POST /api/v1/simulacoes

Executa uma simulação. Stateless — nada é persistido.

### Request

```json
{
  "latitude": -9.649849,
  "longitude": -35.708949,
  "valorContaMensal": 500.00,
  "parametrosAvancados": {
    "precoKwhComImpostos": null,
    "custoPorKwpInstalado": null,
    "potenciaModuloWp": null,
    "percentualAutoconsumo": null,
    "inflacaoTarifariaAnual": null,
    "taxaDescontoAnual": null,
    "anoConexao": null,
    "tipoLigacao": null
  }
}
```

- `parametrosAvancados` é opcional; campos null ou ausentes usam os defaults do servidor.
- `precoKwhComImpostos`: se informado, substitui o cálculo da seção 1 da spec (o usuário
  digitou o preço da fatura dele). Os demais componentes (Fio B etc.) continuam vindo
  da configuração.
- `tipoLigacao`: `"MONOFASICO" | "BIFASICO" | "TRIFASICO"` (default BIFASICO).

Validações: latitude/longitude obrigatórios e dentro da área atendida (Maceió);
`valorContaMensal` obrigatório, entre 50.00 e 50000.00.

### Response 200

```json
{
  "consumoMensalEstimadoKwh": 500,
  "potenciaKitKwp": 4.40,
  "quantidadeModulos": 8,
  "areaNecessariaM2": 17.3,
  "producaoMensalKwh": 531,
  "atendimentoParcial": false,
  "custoImplantacao": 15400.00,
  "economiaAnualAno1": 5514.00,
  "paybackSimplesMeses": 34,
  "paybackDescontadoMeses": 41,
  "vpl25Anos": 61234.00,
  "economiaTotal25Anos": 187000.00,
  "fluxoCaixa": [
    { "ano": 0, "fluxo": -15400.00, "acumuladoNominal": -15400.00, "acumuladoDescontado": -15400.00 },
    { "ano": 1, "fluxo": 5514.00,  "acumuladoNominal": -9886.00,  "acumuladoDescontado": -10387.00 }
  ],
  "qualidadeImagem": "HIGH",
  "dataImagem": "2024-08-01",
  "fonteDados": "Google Solar API",
  "parametrosUtilizados": {
    "precoKwhComImpostos": 0.94123456,
    "custoPorKwpInstalado": 3500.00,
    "potenciaModuloWp": 550,
    "percentualAutoconsumo": 0.30,
    "inflacaoTarifariaAnual": 0.05,
    "taxaDescontoAnual": 0.10,
    "anoConexao": 2026,
    "percentualFioB": 0.60,
    "tipoLigacao": "BIFASICO",
    "vigenciaTarifa": "2026-05"
  },
  "disclaimers": [
    "Estimativa baseada em análise do telhado por imagens (Google Solar API); não substitui visita técnica.",
    "Premissas: bandeira verde, créditos usados no ciclo, sem Tarifa Social."
  ]
}
```

`fluxoCaixa` tem 26 itens (ano 0 a 25). Valores numéricos monetários com 2 casas.
`parametrosUtilizados` sempre ecoa os valores efetivamente usados (para o painel
avançado do frontend exibir e permitir refinamento).

### Erros (Problem Details, RFC 9457)

| HTTP | type (sufixo)              | Quando                                          |
|------|----------------------------|-------------------------------------------------|
| 400  | `parametros-invalidos`     | Bean Validation falhou                          |
| 422  | `fora-da-area-atendida`    | Coordenada fora de Maceió                       |
| 422  | `edificio-nao-encontrado`  | Solar API 404 (clique fora de edificação)       |
| 422  | `conta-abaixo-do-minimo`   | valorContaMensal ≤ CIP                          |
| 503  | `servico-solar-indisponivel` | Falha/timeout na Solar API após retry         |

Corpo de exemplo:

```json
{
  "type": "https://curazi.com.br/erros/edificio-nao-encontrado",
  "title": "Nenhuma edificação encontrada",
  "status": 422,
  "detail": "Clique sobre o telhado de uma edificação em Maceió."
}
```

## GET /api/v1/health

Retorna `{ "status": "UP" }` (actuator ou endpoint simples). Usado pelo Railway.
