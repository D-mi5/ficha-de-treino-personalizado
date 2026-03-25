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

## Playbook rapido de incidente
1. Coletar `X-Request-Id` do erro.
2. Buscar o request nos logs JSON.
3. Verificar se houve `audit_event`, `rate_limit_triggered` ou `generate_workout_failed`.
4. Confirmar configuracao de `CORS_ORIGIN` e chave de IA.
5. Se o problema for externo (IA), validar provedor e credenciais antes de reiniciar servico.
