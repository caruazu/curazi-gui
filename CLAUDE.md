# Curazi — Frontend

## O que é este projeto

Interface web pública do Curazi: planejador de custo de implantação de energia solar
residencial em **Maceió-AL**, para **pessoa física**. É a demo comercial B2B de uma
instaladora — a primeira impressão visual importa tanto quanto os números.
**Não coleta nem persiste dados de usuários** (sem e-mail, sem cadastro, sem analytics
de terceiros nesta fase).

## Stack

- Angular 20 (standalone components), TypeScript 5.9 (partindo do "hello world" deste repo).
- UI: **Angular Material** (Material Design 3). Todo componente visual novo deve usar
  componentes Material antes de considerar CSS próprio; estilização via theming/tokens,
  nunca sobrescrevendo classes internas `.mat-*` diretamente.
- Mapa: Google Maps JavaScript API via `@googlemaps/js-api-loader` (chave de navegador
  restrita por referrer; vem de environment). Usar Google Maps — não Leaflet — porque os
  dados exibidos derivam da Google Solar API (atribuição/consistência).
- Gráfico: Chart.js (via ng2-charts).
- Estado: signals nativos do Angular. Sem NgRx nesta fase.
- Testes: os do scaffold (`ng test`). Cobrir formatação/moeda e o serviço de API.
- Deploy: Vercel.

## Comandos

- Dev server: `npm start` (ng serve)
- Testes: `npm test`
- Build: `npm run build`
- Lint (se configurado): `npm run lint`

## Regras do projeto

1. Idioma da interface: **português (pt-BR)**. Moeda com `CurrencyPipe` locale pt-BR
   (registrar `localePt`). Números com separador brasileiro.
2. A URL do backend vem de `environment.apiBaseUrl`
   (dev: `http://localhost:8080`; prod: URL do Railway). Nunca hardcoded em serviços.
3. O contrato REST é `docs/contrato-api.md` — gerar interfaces TypeScript fiéis a ele
   em `src/app/core/api/` e nunca inventar campos.
4. Consultar a skill `ux-curazi` antes de criar ou alterar qualquer tela.
5. Componentes standalone, novos control flows (`@if`, `@for`), `inject()` em vez de
   constructor injection, `ChangeDetectionStrategy.OnPush`.
6. Acessibilidade mínima: labels em todos os inputs, foco visível, contraste AA,
   textos de erro associados via `aria-describedby`.
7. Exibir atribuição ao Google e a data da imagem (`dataImagem`) junto aos resultados,
   e os `disclaimers` retornados pela API, sempre.
8. Chave do Maps no frontend é pública por natureza (restrita por referrer no Google
   Cloud) — mas a chave da **Solar API nunca** aparece aqui; quem fala com a Solar API
   é o backend.

## O que NÃO fazer nesta fase

- Sem login, sem histórico persistido, sem PWA, sem SSR.
- Sem outras bibliotecas de UI além do Angular Material; importar apenas os módulos
  Material efetivamente usados em cada componente standalone.
- Sem localStorage/cookies de dados do usuário.
