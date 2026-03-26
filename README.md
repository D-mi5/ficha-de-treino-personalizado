# Gerador de Ficha de Treino Feminino

[![CI](https://github.com/D-mi5/ficha-de-treino-personalizado/actions/workflows/ci.yml/badge.svg)](https://github.com/D-mi5/ficha-de-treino-personalizado/actions/workflows/ci.yml)
![Coverage](https://img.shields.io/badge/coverage-vitest%20v8-blue)

Aplicacao web para geracao de fichas de treino femininas personalizadas com IA, regras clinicas e retorno estruturado para interface.

## Visao Geral

O Ficha Femme gera treinos com base em dados reais da usuaria, considerando contexto corporal, nivel de treino, objetivo e sinais de risco clinico.

Problema que resolve:
- reduz prescricao generica;
- adiciona camada de seguranca para perfis com risco;
- padroniza a saida da IA para exibicao confiavel no frontend.

Publico-alvo:
- usuarias que desejam um plano inicial personalizado;
- time tecnico que precisa manter e evoluir o sistema com confiabilidade.

## Funcionalidades

- Cadastro, login, logout e sessao com cookie seguro.
- Geracao de ficha personalizada via IA com prompt estruturado.
- Analise automatica de IMC, intensidade, nivel de risco e progressao semanal.
- Ajuste automatico de objetivo em cenarios clinicos de conflito.
- Validacao de entrada e validacao estrita do contrato JSON da IA.
- Retry de chamadas IA com timeout e fallback local estruturado.
- Historico local + sincronizacao com backend.
- Dashboard com consolidacao de historico e regras clinicas.

## Tecnologias Utilizadas

### Frontend
- HTML estatico
- JavaScript vanilla
- Tailwind CSS (build/watch via CLI)
- Fetch API para comunicacao com backend
- LocalStorage para persistencia local de payload/historico
- PWA (Service Worker + Web App Manifest)

### Backend
- Node.js
- Express
- TypeScript
- Zod para validacao
- OpenAI SDK (incluindo compatibilidade com Gemini via endpoint OpenAI-like)

### IA
- Prompt estruturado com regras obrigatorias
- Providers: Gemini e OpenAI
- Validacao de schema da resposta antes de retornar ao cliente

## Arquitetura do Sistema

Separacao de responsabilidades:
- Camada de Interface (Frontend): coleta dados, controla estado local, chama API e renderiza plano/historico.
- Camada de API (Backend Express): recebe requests, valida payload, aplica auditoria/rate limit e devolve resposta.
- Camada de Dominio Clinico: calcula IMC, classifica risco, ajusta objetivo/frequencia e define progressao.
- Camada de IA: constroi prompt estruturado, consulta provider, valida contrato JSON e trata retries.
- Camada de Contingencia: gera plano local estruturado quando a IA nao retorna payload valido.

Mapa de componentes (visao logica):
1. Frontend Pages + Scripts
2. API Routes
3. Domain Services (`metrics`, `schemas`, `prompt`)
4. AI Orchestrator (`agents`)
5. Fallback Planner (`local-workout-plan`)
6. History/Auth Infra (`history`, `auth`, `middleware`)

Fluxo principal (happy path):
1. Usuario preenche formulario.
2. Frontend envia payload para `/api/generate-workout`.
3. Backend valida com `profileSchema`.
4. Backend executa `analyzeProfile`.
5. Backend gera prompt com `buildWorkoutPrompt`.
6. Backend consulta IA e recebe resposta.
7. Backend valida JSON com `workoutResponseSchema`.
8. Backend retorna `WorkoutResponse`.
9. Frontend renderiza tabela/cards e persiste historico.

Fluxos alternativos de resiliencia:
- Erro de parse/schema da IA: backend monta instrucao de compliance e tenta novamente.
- Timeout/instabilidade do provider: backend aplica retry com backoff e troca de provider quando possivel.
- Falha final de provider/parsing: backend retorna fallback local estruturado para nao interromper UX.

Aspectos de arquitetura operacional:
- Seguranca: helmet, CORS por allowlist, cookies `httpOnly` e `sameSite=strict`.
- Confiabilidade: rate limits por rota sensivel, timeout configuravel, graceful shutdown.
- Observabilidade: logs JSON estruturados, auditoria de eventos e `X-Request-Id` por request.

## Estrutura de Pastas

Estrutura real do repositorio:

```text
backend/
	src/
		__tests__/
		agents.ts
		app.ts
		history.ts
		local-workout-plan.ts
		metrics.ts
		prompt.ts
		routes/
		schemas.ts
		server.ts
frontend/
	assets/
	scripts/
		__tests__/
	styles/
docs/
e2e/
scripts/
```

Mapeamento de implementacao por area:

Backend core:
- `backend/src/app.ts`: composicao da aplicacao Express (middlewares, CORS, static, rate limit global de API).
- `backend/src/server.ts`: bootstrap, validacao de config e lifecycle do processo.
- `backend/src/agents.ts`: orquestracao de IA (provider order, timeout, retry, parse e validacao).
- `backend/src/prompt.ts`: definicao do prompt base e montagem do prompt final com analise previa.
- `backend/src/metrics.ts`: regras clinicas e decisao de negocio (IMC, risco, intensidade, objetivo, frequencia).
- `backend/src/schemas.ts`: contratos Zod de entrada/saida e compatibilidade de historico.
- `backend/src/local-workout-plan.ts`: fallback deterministico para manter contrato quando IA falha.

Backend API:
- `backend/src/routes/workout-routes.ts`: endpoint de geracao de treino.
- `backend/src/routes/auth-routes.ts`: cadastro, login, logout.
- `backend/src/routes/history-routes.ts`: consulta/sync de historico.
- `backend/src/routes/dashboard-routes.ts`: visao consolidada de historico + regras clinicas.
- `backend/src/routes/page-routes.ts`: roteamento de paginas estaticas.

Frontend:
- `frontend/form.html`, `frontend/result.html`, `frontend/login.html`, `frontend/dashboard.html`: telas principais.
- `frontend/scripts/form.js`: validacao do formulario e montagem de payload.
- `frontend/scripts/result.js`: chamada de geracao, parser/render, historico local/sync.
- `frontend/scripts/auth.js`: fluxo de autenticacao e navegacao entre abas login/cadastro.
- `frontend/scripts/dashboard.js`: filtros, metricas e listagem de historico.
- `frontend/scripts/api-client.js`: camada de chamadas HTTP com tratamento de timeout/erros.
- `frontend/sw.js`: cache e comportamento offline da PWA.

Qualidade e operacao:
- `backend/src/__tests__` e `frontend/scripts/__tests__`: testes unitarios/integracao.
- `e2e/`: testes de fluxo com Playwright.
- `docs/`: guias tecnico-operacionais.
- `scripts/`: utilitarios de execucao de testes e automacoes.

## Principais Funcoes do Sistema

- `buildWorkoutPrompt(profile, analysis)`
	Gera o prompt final incluindo dados da cliente, analise previa e contrato JSON obrigatorio.

- `analyzeProfile(profile)`
	Calcula IMC/classificacao, intensidade sugerida, progressao, risco, ajustes de objetivo e frequencia.

- `resolveObjectiveConflict(idade, imc, objetivo)`
	Ajusta objetivo quando ha conflito clinico (ex.: obesidade + hipertrofia).

- `adjustTrainingDays(dias, profile, imc)`
	Limita frequencia semanal para aumentar seguranca em perfis de risco.

- `generateWorkout(profile)`
	Orquestra providers IA, aplica timeout/retry, valida JSON e usa fallback local se necessario.

- `buildLocalWorkoutFallback(profile, analysis)`
	Gera plano estruturado localmente para garantir continuidade do fluxo.

## Rotas do Backend

### Saude
- `GET /api/health`
	Retorna status do servico.

### Treino
- `POST /api/generate-workout`
	Entrada: payload `ClientProfile` validado por `profileSchema`.
	Saida: `WorkoutResponse` com `workoutPlan` estruturado e `analysis`.

### Autenticacao
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Historico
- `GET /api/history`
- `POST /api/history/sync`

### Dashboard
- `GET /api/dashboard`

## Modelos de Dados

### ClientProfile

Campos principais:
- `nome?: string`
- `idade: number`
- `peso: number`
- `altura: number`
- `objetivo: "emagrecimento" | "hipertrofia" | "definicao"`
- `nivel: "iniciante" | "intermediario" | "avancado"`
- `focoTreino?: "nenhum" | "quadriceps" | "gluteo" | "posteriores" | "costas" | "peito"`
- `diasSemana: number`
- `periodicidade?: "semanal" | "quinzenal" | "mensal"`
- `observacoes?: string`

### ProfileAnalysis / WorkoutAnalysis

Campos principais:
- `imc: number`
- `classificacaoImc: string`
- `intensidadeSugerida: "leve" | "moderada" | "intensa"`
- `progressaoSemanal: string`
- `contextoClinico: string`
- `mensagemAjuste: string | null`
- `objetivoFinal: Objetivo`
- `diasTreinoAjustados: number`
- `motivoAjusteDiasTreino: string | null`
- `nivelRisco: "baixo" | "moderado" | "alto"`
- `comentariosEssenciais: string[]`

## Logica de Negocio

- Calculo de IMC usando peso e altura.
- Classificacao de IMC com normalizacao de nomenclatura para exibicao.
- Intensidade sugerida por risco clinico + idade + nivel.
- Progressao semanal adaptada ao risco.
- Ajuste automatico de objetivo para preservar seguranca.
- Adaptacao de frequencia semanal para reduzir sobrecarga.
- Adaptacao por dor/comorbidade detectada em observacoes via padrao textual.
- Divisao semanal e selecao de exercicios orientadas por objetivo, nivel, foco e risco.

## Sistema de IA (Core)

O core da IA combina 4 camadas:

1. Prompt estruturado:
- regras obrigatorias de seguranca e qualidade;
- formato de saida estritamente definido.

2. Contrato JSON:
- `workoutPlanSchema` + `workoutAnalysisSchema` + `workoutResponseSchema`.

3. Resiliencia:
- timeout configuravel;
- retries em erro transiente e nao conformidade de payload;
- fallback entre providers quando disponivel.

4. Contingencia:
- fallback local estruturado quando IA nao entrega resposta valida.

## Como Rodar o Projeto

### 1) Requisitos
- Node.js 20+
- npm 10+

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar ambiente

Crie `.env` a partir de `.env.example`.

Linux/macOS:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Preencha principalmente:
- `AI_PROVIDER`
- `GEMINI_API_KEY` e/ou `OPENAI_API_KEY`
- `CORS_ORIGIN`

### 4) Rodar em desenvolvimento

```bash
npm run dev
```

Esse comando inicia:
- backend em watch (`tsx watch`)
- Tailwind em watch (geracao de CSS)

### 5) Build de producao

```bash
npm run build
```

### 6) Executar build

```bash
npm start
```

## Testes

Unitario/Integracao:

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

E2E:

```bash
npm run test:e2e
```

## Observabilidade e Seguranca

- `X-Request-Id` em todas as respostas.
- Logs JSON estruturados com mascara de campos sensiveis.
- Auditoria de eventos sensiveis (auth, dashboard, geracao, sync).
- Rate limits dedicados por rota critica.
- CORS por allowlist.
- Cookie de sessao `httpOnly`, `sameSite=strict` e `secure` em producao.

## Documentacao Complementar

- Operacao e suporte: [docs/operacao.md](docs/operacao.md)
- Documentacao tecnica detalhada: [docs/documentacao-tecnica-sistema.txt](docs/documentacao-tecnica-sistema.txt)

## Deploy (Render)

Projeto preparado para deploy via blueprint em `render.yaml`.

Passos resumidos:
1. Criar servico via Blueprint no Render.
2. Informar variaveis de ambiente obrigatorias.
3. Publicar e validar `/api/health`.

## Roadmap Tecnico (Possiveis Melhorias)

- Evolucao automatica por ciclo com base em historico.
- Camada nutricional integrada.
- Persistencia de dados com banco dedicado para multi-dispositivo robusto.
