# Curazi

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Angular Material](https://img.shields.io/badge/Angular_Material-757575?style=for-the-badge&logo=materialdesign&logoColor=white)
![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white)
![RxJS](https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Google Maps](https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)
![Jasmine](https://img.shields.io/badge/Jasmine-8A4182?style=for-the-badge&logo=jasmine&logoColor=white)
![Karma](https://img.shields.io/badge/Karma-56C5A8?style=for-the-badge&logo=karma&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## Sobre

O **Curazi** é um planejador de custo para implantação de energia solar residencial em **Maceió-AL**, voltado a **pessoa física**. Esta aplicação é a interface web pública do sistema e serve como demo comercial B2B de uma instaladora.

Em uma única página, o usuário:

1. **Aponta o telhado do imóvel** em um mapa de satélite (Google Maps), com busca por endereço/CEP e autocomplete;
2. **Informa o valor médio mensal da conta de luz**, podendo refinar parâmetros avançados (preço do kWh, custo por kWp, tipo de ligação, taxa de desconto etc.);
3. **Recebe a simulação**: custo de implantação, economia no primeiro ano, payback (simples e descontado), potência do kit, quantidade de módulos, área necessária, produção mensal e um gráfico do fluxo de caixa acumulado em 25 anos;
4. **Vê o sistema desenhado sobre o telhado**: o mapa enquadra o edifício analisado e desenha três camadas ilustrativas — um "holofote" que escurece o entorno, os planos do telhado e os painéis do sistema orçado, posicionados e alinhados conforme a geometria retornada pela API (azimute, inclinação e orientação de cada painel).

Os dados do telhado derivam da **Google Solar API**, consumida exclusivamente pelo backend. 
A aplicação **não coleta nem persiste dados de usuários** — sem cadastro, sem e-mail e sem analytics de terceiros nesta fase.

## Documentação

A documentação do projeto é composta por três frentes:

- **Este README** — visão geral, instalação, execução e deploy;
- **[ABOUT.md](ABOUT.md)** — **descrição da arquitetura do sistema**: camadas, diagramas (fluxo, sequência e classes), padrões de projeto e responsabilidades de cada classe;
- **[docs/contrato-api.md](docs/contrato-api.md)** — contrato REST compartilhado com o  backend; as interfaces TypeScript em `src/app/core/api/` são fiéis a ele.

## Instalação

### Dependências

- **Node.js** LTS com **npm** (compatível com Angular 20);
- **Angular CLI** (opcional globalmente — os scripts do `package.json` usam a versão local);
- Navegador **Chrome/Chromium** para os testes unitários (Karma);
- **Backend Curazi** rodando localmente na porta `8080` para o fluxo completo  (a interface abre sem ele, mas a simulação falha com erro de rede);
- Uma **chave de navegador do Google Maps** (Maps JavaScript API) restrita por  referrer no Google Cloud.

### Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo de chaves a partir do modelo (ele é ignorado pelo git):

   ```bash
   cp src/environments/keys.example.ts src/environments/keys.ts
   ```

   Preencha `googleMapsBrowserKey` com a chave de navegador do Maps. Essa chave é pública por natureza (restrita por referrer); a chave da **Solar API nunca** entra no frontend.

3. A URL do backend vem de `environment.apiBaseUrl`:
   - `src/environments/environment.development.ts` → `http://localhost:8080`;
   - `src/environments/environment.ts` (produção) → URL do backend no Railway.

### Inicialização

```bash
npm start
```

A aplicação sobe em `http://localhost:4200`. **Use sempre a porta 4200**: o CORS do backend em desenvolvimento aceita apenas `http://localhost:4200`.

## Execução

- **Desenvolvimento** (servidor com live reload):

  ```bash
  npm start
  ```

- **Testes unitários** (Karma + Jasmine):

  ```bash
  npm test
  ```

  Em ambiente headless (CI/devcontainer), use um launcher sem sandbox, por exemplo:

  ```bash
  npm test -- --watch=false --browsers=ChromeHeadlessNoSandbox
  ```

- **Build de produção** (artefatos em `dist/curazi-gui/browser`):

  ```bash
  npm run build
  ```

- **Build contínuo em modo desenvolvimento**:

  ```bash
  npm run watch
  ```

## Deploy

O deploy é feito na **Vercel** como site estático (SPA):

- `vercel.json` define o build (`npm run build`), o diretório de saída (`dist/curazi-gui/browser`) e o rewrite de todas as rotas para `index.html` (necessário para o roteamento client-side do Angular);
- O build de produção usa `src/environments/environment.ts`, que aponta para o backend hospedado no **Railway**.

Considerações de infraestrutura:

- **CORS**: o domínio da Vercel precisa estar na allowlist do backend antes do deploy — atenção aos *preview deployments*, que recebem subdomínio aleatório;
- **Chave do Maps**: a restrição por referrer no Google Cloud deve incluir o domínio de produção (e os de preview, se usados);
- Não há servidor próprio nem SSR: todo o processamento da simulação acontece no backend, e o frontend é servido pela CDN da Vercel.

## Ambientes

| Ambiente        | Frontend                          | Backend (`apiBaseUrl`)                  |
|-----------------|-----------------------------------|-----------------------------------------|
| Desenvolvimento | `http://localhost:4200` (ng serve) | `http://localhost:8080`                |
| Preview         | subdomínio aleatório `*.vercel.app` | backend no Railway                    |
| Produção        | domínio do projeto na Vercel      | `https://curazi-api.up.railway.app`     |

Notas:

- Em desenvolvimento, o backend roda em outro devcontainer da mesma máquina, com a
  porta `8080` encaminhada ao host. Para o **navegador** (que roda no host),
  `localhost:8080` funciona; de **dentro** do devcontainer do frontend (curl, scripts,
  testes headless), use `http://host.docker.internal:8080`;
- Não há ambiente de homologação dedicado nesta fase — os preview deployments da
  Vercel cumprem esse papel.

## Observações

**Notas operacionais**

- A simulação é *stateless*: nada é persistido em nenhuma camada, e não há
  localStorage/cookies de dados do usuário;
- A interface é inteiramente em **português (pt-BR)**, incluindo formatação de moeda
  e números;
- A atribuição ao Google e a data da imagem de satélite (`dataImagem`), bem como os
  `disclaimers` retornados pela API, são sempre exibidos junto aos resultados
  (obrigação contratual da Google Solar API).

**Limitações conhecidas**

- Atende apenas coordenadas dentro de **Maceió-AL** (validação no backend, espelhada
  no bounding box do mapa);
- Valor da conta limitado à faixa de **R$ 50,00 a R$ 50.000,00**;
- Os resultados são **estimativas** baseadas em análise de imagens; não substituem
  visita técnica nem projeto definitivo;
- O desenho dos painéis no mapa é **ilustrativo**: usa as dimensões e posições do
  painel de referência da Google Solar API, não do módulo comercial orçado — o layout
  real é definido na visita técnica. Respostas sem o bloco `geometria` simplesmente
  não desenham nada;
- Sem login, sem histórico, sem PWA e sem SSR nesta fase (decisão de escopo).

**Desempenho, armazenamento e escalabilidade**

- A página do simulador é carregada por **lazy loading**; o bundle inicial fica
  pequeno e o chunk pesado (Material + Chart.js + página) só é baixado na rota;
- A biblioteca do Google Maps é carregada **uma única vez** por sessão
  (`GoogleMapsLoaderService`) e o autocomplete de endereços usa debounce e
  *session tokens* para reduzir custo de API;
- Por ser um site estático em CDN sem estado, o frontend escala horizontalmente sem
  configuração adicional — o limite de escala é o backend e as cotas das APIs do Google.