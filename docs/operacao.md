# Operacao do Projeto

## Objetivo
Aplicacao para geracao de ficha de treino personalizada feminina com fluxo frontend -> backend -> IA -> frontend.

## Variaveis de ambiente criticas
- `NODE_ENV`: use `production` em ambiente produtivo.
- `CORS_ORIGIN`: lista CSV com os dominios autorizados.
- `AI_PROVIDER`: `openai` ou `gemini`.
- `OPENAI_API_KEY`: obrigatoria quando o provider efetivo for OpenAI.
- `GEMINI_API_KEY`: obrigatoria quando o provider efetivo for Gemini, salvo fallback explicito via `OPENAI_API_KEY`.
- `OPENAI_MODEL` ou `GEMINI_MODEL`: opcional, conforme provider.
- `AI_TEMPERATURE`: opcional. Padrao recomendado: `0.25` para maior consistencia de JSON e prescricao.
- `AI_MAX_TOKENS`: opcional. Padrao recomendado: `2800` para acomodar ficha completa sem excesso de verbosidade.
- `LOG_LEVEL=debug`: opcional para depuracao controlada.

## Checklist de producao
1. Definir `CORS_ORIGIN` com os dominios oficiais.
2. Definir a chave do provider de IA em uso.
3. Garantir HTTPS para que cookies `secure` funcionem corretamente.
4. Validar se o frontend usa o mesmo dominio ou um dominio explicitamente permitido.
5. Monitorar respostas `429` para ajustar capacidade e UX.

## Observabilidade
Os logs sao emitidos em JSON com os campos:
- `ts`: timestamp ISO.
- `level`: nivel do log.
- `msg`: nome do evento.
- `ctx`: contexto sanitizado.

Campos sensiveis como email, token, cookie, password e secret sao mascarados automaticamente.

## Request ID
Cada resposta inclui o header `X-Request-Id`.
Use esse valor para correlacionar:
- erro reportado pelo frontend
- logs do backend
- eventos de auditoria

## Origem da Geracao (IA x Fallback)
As respostas de `POST /api/generate-workout` podem incluir:
- header `X-Generation-Source`: `ai`, `fallback-local` ou `unknown`
- campo opcional `generationMeta` no JSON de resposta

Exemplo de `generationMeta`:
- `source`: origem da resposta (`ai` ou `fallback-local`)
- `provider`: provedor efetivo quando houver IA (`openai` ou `gemini`)
- `model`: modelo utilizado na tentativa bem-sucedida
- `attempts`: tentativa em que a resposta foi concluída
- `fallbackReason`: motivo resumido quando houver fallback (`timeout`, `provider-unavailable`, `invalid-output`, `missing-credentials`, `unknown`)

Recomendação operacional:
- monitorar aumento de `fallback-local`
- cruzar `X-Request-Id` com `generationMeta` e logs `generate_workout_provider_success`/`generate_workout_fallback_local`
- investigar credenciais, estabilidade do provedor e qualidade do payload quando fallback subir

## Eventos auditados
- cadastro
- login
- logout
- geracao de ficha
- sincronizacao de historico
- acesso ao dashboard

Cada evento registra rota, duracao, status HTTP e contexto minimo operacional sem expor segredos.

## Rate limits sensiveis
- `POST /api/auth/register`: 5 tentativas por 15 minutos
- `POST /api/auth/login`: 10 tentativas por 10 minutos
- `POST /api/generate-workout`: 20 requisicoes por 10 minutos

Se um cliente exceder o limite, a API responde `429` com mensagem controlada.

## Endpoints da API

### Autenticacao
- `POST /api/auth/register`: cadastro de novo usuario. Rate limit: 5 por 15min.
- `POST /api/auth/login`: autenticacao. Rate limit: 10 por 10min.
- `POST /api/auth/logout`: encerra sessao. Remove cookie `sessionToken`.

### Geracao de Ficha
- `GET /api/health`: verificacao de disponibilidade do servico.
- `POST /api/generate-workout`: gera ficha personalizada. Rate limit: 20 por 10min.

### Historico
- `GET /api/history`: retorna historico de fichas do cliente via `clientId`.
- `POST /api/history/sync`: sincroniza historico offline com usuario autenticado. Merge automatico.

### Dashboard
- `GET /api/dashboard`: requer autenticacao. Retorna historico + `clinicalRules` (regras de validacao).

### Paginas
- `GET /form`: formulario de entrada (publica).
- `GET /resultado`: resultado da geracao (publica).
- `GET /entrar`: pagina de login (publica).
- `GET /historico-offline`: historico em modo offline (publica).
- `GET /dashboard`: dashboard autenticado. Redireciona para `/entrar` se nao autenticado.

## Configuracoes de Tempo e Limites

- **Sessao autenticada**: `sessionToken` valido por **7 dias**.
- **Historico anonimo**: `clientId` armazenado por **30 dias**.
- **Limite do historico**: maximo de **10 entradas** por cliente.
- **Timeout da IA**: **45 segundos** (configuravel via `IA_TIMEOUT_MS`).
- **Tentativas de retry na IA**: maximo **3 tentativas** com backoff exponencial.

## Fluxo de Historico e Autenticacao

1. Usuario anonimo gera fichas -> historico armazenado sotto `clientId` (cookie).
2. Usuario faz login -> `POST /api/history/sync` migra automaticamente todo historico anonimo para sua conta.
3. Apos login, acesso a `/api/dashboard` retorna historico unificado + regras clinicas.
4. Logout limpa `sessionToken` mas mantem `clientId` para futuras sessoes anonimas.

## Fallback de Provedor IA

Se `AI_PROVIDER=gemini` e a requisicao falhar:
- Sistema tenta automaticamente com `OPENAI_API_KEY` como fallback.
- Se fallback nao estiver disponivel ou tambem falhar, retorna `503` com mensagem controlada.
- Garantir que **ambas as chaves** estejam definidas em producao para resiliencia.

## Operacao de Tecnicas Avancadas (Foco e Enfase)

Regras operacionais vigentes:
- Tecnicas avancadas so sao aplicadas quando o campo `focoTreino` estiver preenchido.
- Focos validos para tecnicas: `quadriceps`, `posteriores`, `gluteo`, `costas`, `peito`.
- Sem foco preenchido (`nenhum`), a ficha deve sair sem tecnicas avancadas.
- Tecnicas aparecem apenas no treino de enfase (primeiro treino da semana que contem o grupamento foco).
- Tecnicas sao aplicadas apenas nos exercicios do grupamento foco.

Comportamento por nivel:
- Intermediario com foco: aplicar 2 tecnicas no treino de enfase (`bi-set` e `tri-set`).
- Avancado com foco e intensidade intensa: aplicar ate 3 tecnicas no treino de enfase (`bi-set`, `tri-set`, `rest-pause`).
- Perfil de risco alto: bloquear tecnicas avancadas.

## Ficha Autoexplicativa para Cliente

Padrao de saida para reduzir duvida de execucao:
- `bi-set`: deve explicitar o par de exercicios na propria linha.
- `tri-set`: deve explicitar os 3 exercicios do mesmo grupamento e a ordem de execucao.
- `rest-pause`/`drop-set`: deve incluir orientacao curta de pausa, reducao de carga e controle tecnico.

Exemplo esperado:
- `Leg press (tri-set: Cadeira extensora + Leg press + Hack machine, em sequencia sem descanso; descansar 60-90s ao final)`

Regra de exibicao no frontend:
- Se o nome do exercicio ja contem a explicacao da tecnica, nao renderizar selo visual duplicado de "Tecnica avancada".

## Checklist de Validacao Operacional (Tecnicas)

1. Gerar ficha com `focoTreino=nenhum` e confirmar ausencia de `tecnicaAvancada`.
2. Gerar ficha com foco valido e confirmar tecnicas apenas no treino de enfase.
3. Confirmar que exercicios fora do grupamento foco nao recebem tecnica.
4. Confirmar que `tri-set` lista explicitamente os 3 exercicios do bloco.
5. Confirmar que a tela nao duplica tecnica (nome + badge) para o mesmo exercicio.

## Comandos Rapidos de QA (1 minuto)

Execute os comandos abaixo na raiz do projeto:

1. Sem foco (nao deve ter tecnica avancada)

```bash
npx tsx --env-file=.env --eval "import { analyzeProfile } from './backend/src/metrics.ts'; import { buildLocalWorkoutFallback } from './backend/src/local-workout-plan.ts'; const p={nome:'QA',idade:35,peso:70,altura:1.66,objetivo:'definicao',nivel:'intermediario',focoTreino:'nenhum',diasSemana:4,periodicidade:'mensal',observacoes:''}; const a=analyzeProfile(p as any); const out=buildLocalWorkoutFallback(p as any,a); const tecs=out.workoutPlan.treinos.flatMap((t:any)=>t.exercicios.filter((e:any)=>e.tecnicaAvancada)); console.log('tecnicas:', tecs.length);"
```

2. Com foco (deve ter tecnica apenas no treino de enfase e no grupo foco)

```bash
npx tsx --env-file=.env --eval "import { analyzeProfile } from './backend/src/metrics.ts'; import { buildLocalWorkoutFallback } from './backend/src/local-workout-plan.ts'; const p={nome:'QA',idade:31,peso:63,altura:1.66,objetivo:'hipertrofia',nivel:'avancado',focoTreino:'quadriceps',diasSemana:4,periodicidade:'mensal',observacoes:''}; const a=analyzeProfile(p as any); const out=buildLocalWorkoutFallback(p as any,a); out.workoutPlan.treinos.forEach((t:any)=>{ const tecs=t.exercicios.filter((e:any)=>e.tecnicaAvancada).map((e:any)=>({nome:e.nome,grupo:e.grupoMuscular,tec:e.tecnicaAvancada})); if (tecs.length) console.log(t.dia, t.nome, tecs); });"
```

3. Verificar se o tri-set descreve os 3 exercicios no nome

```bash
npx tsx --env-file=.env --eval "import { analyzeProfile } from './backend/src/metrics.ts'; import { buildLocalWorkoutFallback } from './backend/src/local-workout-plan.ts'; const p={nome:'QA',idade:31,peso:63,altura:1.66,objetivo:'hipertrofia',nivel:'avancado',focoTreino:'quadriceps',diasSemana:4,periodicidade:'mensal',observacoes:''}; const a=analyzeProfile(p as any); const out=buildLocalWorkoutFallback(p as any,a); const t=out.workoutPlan.treinos.find((x:any)=>x.dia==='A'); console.log(t.exercicios.map((e:any)=>e.nome).join('\n'));"
```

Resultado esperado:
- Comando 1: `tecnicas: 0`.
- Comando 2: tecnicas apenas no treino de enfase e no grupo foco.
- Comando 3: texto de `tri-set` contendo 3 exercicios explicitamente.

## Playbook rapido de incidente
1. Coletar `X-Request-Id` do erro.
2. Buscar o request nos logs JSON.
3. Verificar se houve `audit_event`, `rate_limit_triggered` ou `generate_workout_failed`.
4. Confirmar configuracao de `CORS_ORIGIN` e chave de IA.
5. Se o problema for externo (IA), validar provedor e credenciais antes de reiniciar servico.
