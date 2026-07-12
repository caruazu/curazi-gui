---
name: ux-curazi
description: Especificação de UX e telas do Curazi (fluxo, componentes, estados de erro, painel avançado, gráfico de payback, identidade visual). Consultar SEMPRE antes de criar ou alterar componentes, layout ou textos da interface.
---

# UX Curazi — Especificação de telas

## Identidade visual — Angular Material (M3)

- Tom: profissional, limpo, confiável. Público: consumidor residencial + funcionário
  de instaladora usando na frente do cliente.
- Design system: **Material Design 3 via Angular Material**. Tema claro customizado
  com `define-theme`: paleta primária derivada de verde `#1B5E20`, terciária/acento
  âmbar `#FFB300`, erro padrão M3. Densidade 0. Tipografia Roboto (padrão Material).
- Regra: componentes Material sempre que existirem (botões, campos, cards, expansão,
  select, spinner, snackbar, toolbar). CSS próprio só para layout (grid/flex) e para o
  container do mapa/gráfico. Nunca estilizar classes internas `.mat-*` diretamente —
  usar a API de theming/tokens.
- Layout responsivo: desktop (demo em projetor/notebook) é prioridade 1; mobile
  funcional é prioridade 2. Breakpoint único ~900px.

## Fluxo (página única, 3 seções empilhadas)

### Seção 1 — Localização
- Título: "1. Aponte o telhado do imóvel em Maceió".
- Mapa Google (satélite por padrão, zoom inicial 12, centro Maceió −9.6499, −35.7089),
  altura ~420px desktop. Clique posiciona um marker e guarda lat/lng.
- Campo de busca por endereço/CEP acima do mapa (Geocoding via Maps JS `Geocoder`,
  com `componentRestrictions: { country: 'br' }`) — ao encontrar, centraliza e pede
  confirmação do clique no telhado ("ajuste o pino sobre o telhado").
- Endereço aproximado do ponto exibido abaixo do mapa (reverse geocode) — informativo.

### Seção 2 — Conta de energia
- Campo "Valor médio mensal da conta de luz (R$)": `mat-form-field` outline com prefixo
  "R$" e máscara monetária pt-BR (diretiva própria simples; não instalar lib de máscara).
- "Parâmetros avançados": `mat-expansion-panel` (colapsado por padrão).
- Botão primário "Simular economia": `mat-flat-button` cor primária — habilita só com
  pino posicionado + valor válido (50 a 50.000). Durante a chamada:
  `mat-progress-spinner` diameter 20 dentro do botão + botão desabilitado.

### Painel avançado (mat-expansion-panel, colapsado por padrão)
Campos, todos opcionais, pré-preenchidos com os `parametrosUtilizados` da última
resposta (ou vazios antes da primeira simulação, com placeholder "padrão do sistema"):
- Preço do kWh com impostos (R$) — "confira na sua fatura"
- Custo por kWp instalado (R$)
- Potência do módulo (Wp)
- Tipo de ligação (mono/bi/trifásico — select)
- Ano de conexão (select, ano corrente ± 2)
- Autoconsumo simultâneo (%), Inflação tarifária (% a.a.), Taxa de desconto (% a.a.)
Texto de apoio: "Campos para profissionais. Se não souber, deixe em branco."

### Seção 3 — Resultados (aparece após sucesso, com scroll suave)
- Grade de `mat-card` (2×3 ou 3×2, CSS grid): Custo de implantação (destaque, maior),
  Economia no 1º ano, Payback (formato "2 anos e 10 meses" — usar o descontado como
  principal e o simples como secundário no mesmo card), Potência do kit (kWp),
  Módulos + área (m²), Produção mensal (kWh/mês).
- **Gráfico principal**: linha do fluxo de caixa ACUMULADO (nominal e descontado, duas
  séries) por ano 0–25, com linha horizontal em R$ 0 e ponto/annotation no payback.
  Eixo Y em R$ (formato compacto pt-BR: "R$ 15 mil"). Tooltip com valores completos.
- Se `atendimentoParcial=true`: banner âmbar "O telhado comporta um sistema que atende
  parte do consumo; valores calculados para o máximo possível."
- Rodapé dos resultados: `disclaimers` da API em texto pequeno + "Análise de telhado:
  Google Solar API — imagem de {dataImagem}" (atribuição obrigatória) + vigência da
  tarifa (`parametrosUtilizados.vigenciaTarifa`).
- Botão secundário "Refazer simulação" (limpa resultados, mantém pino e valores).

## Estados de erro

Erros de negócio (422): banner inline na seção 2 — `mat-card` com `role="alert"`,
fundo de erro do tema, ícone `error_outline`. Erros transitórios (503/rede):
`MatSnackBar` com ação "Tentar de novo". Nunca `alert()`.

| Erro da API                  | Mensagem ao usuário                                              |
|------------------------------|------------------------------------------------------------------|
| fora-da-area-atendida        | "No momento atendemos apenas Maceió-AL."                         |
| edificio-nao-encontrado      | "Não encontramos uma edificação nesse ponto. Clique sobre um telhado." |
| conta-abaixo-do-minimo       | "Informe um valor de conta acima de R$ {mínimo}."                |
| servico-solar-indisponivel   | "Serviço de análise temporariamente indisponível. Tente de novo em instantes." |
| falha de rede                | "Sem conexão com o servidor. Verifique sua internet."            |

## Componentes Angular esperados

```
src/app/
├── core/api/        → SimulacaoService (HttpClient) + interfaces do contrato
├── features/simulador/          (uma pasta por componente: .ts, .html, .scss, .spec.ts)
│   ├── simulador-page/          (orquestra, signals de estado)
│   ├── mapa-localizacao/
│   ├── formulario-conta/
│   ├── painel-avancado/
│   ├── resultados/
│   └── grafico-fluxo-caixa/
└── shared/
    ├── pipes/       → moeda compacta, meses→"X anos e Y meses"
    └── directives/  → máscara monetária
```

Estado da página em signals: `coordenada`, `valorConta`, `parametrosAvancados`,
`resultado`, `carregando`, `erro`. Sem service de estado global.

## Textos fixos

- Header: `mat-toolbar` primária com texto "Curazi" + tagline "Descubra quanto você
  economiza com energia solar em Maceió".
- Footer: "Simulação estimativa. Consulte um profissional para projeto definitivo." +
  atribuições legais do Google Maps.
