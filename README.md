# Gerador de Ficha de Treino Feminino

[![CI](https://github.com/D-mi5/ficha-de-treino-personalizado/actions/workflows/ci.yml/badge.svg)](https://github.com/D-mi5/ficha-de-treino-personalizado/actions/workflows/ci.yml)
![Coverage](https://img.shields.io/badge/coverage-vitest%20v8-blue)

Aplicacao full-stack para geracao de fichas de treino personalizadas com frontend estatico, backend em Express/TypeScript e integracao com provedor de IA.

## Arquitetura
- Frontend: HTML, CSS gerado com Tailwind e JavaScript vanilla.
- Backend: Express + TypeScript.
- Validacao: Zod.
- Testes backend: Vitest + Supertest.
- Testes E2E: Playwright.
- Observabilidade: logs JSON estruturados com requestId e auditoria.

## Fluxo principal
1. O frontend coleta os dados da cliente.
2. O backend valida o payload.
3. O backend envia o contexto para a IA.
4. O backend devolve a ficha para o frontend.
5. O frontend renderiza o resultado e persiste historico local/servidor.

## Requisitos
- Node.js 20+
- npm 10+

## Setup local
1. Instale dependencias:
```bash
npm install
```

2. Crie o arquivo de ambiente a partir do exemplo:
```bash
cp .env.example .env
```
No Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

3. Preencha as variaveis obrigatorias no `.env`.

## Scripts
- Desenvolvimento completo:
```bash
npm run dev
```

- Backend em modo watch:
```bash
npm run dev:server
```

- Build:
```bash
npm run build
```

- Testes backend/integracao:
```bash
npm test
```

- Testes E2E de navegador:
```bash
npm run test:e2e
```

## Variaveis de ambiente principais
Veja [.env.example](.env.example) para o modelo.

Campos mais importantes:
- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `LOG_LEVEL`

## Testes
### Backend e integracao
A suite cobre:
- validacao de schemas
- rotas de autenticacao
- historico
- dashboard
- rate limits
- configuracao de runtime

### E2E
A suite Playwright cobre:
- formulario -> resultado
- falha controlada na tela de resultado
- cadastro -> dashboard
- logout
- filtro por objetivo no dashboard

## Observabilidade e seguranca
- `X-Request-Id` em todas as respostas.
- Logs JSON estruturados.
- Mascara de dados sensiveis em logs.
- Auditoria de rotas sensiveis.
- CORS restrito por allowlist.
- Rate limit dedicado para cadastro, login e geracao de ficha.

## Operacao
Para operacao e suporte, consulte [docs/operacao.md](docs/operacao.md).

## Deploy (Render)
Este repositório já está pronto para deploy no Render via blueprint.

1. No Render, selecione New + > Blueprint.
2. Conecte o repositório `D-mi5/ficha-de-treino-personalizado`.
3. Confirme as variáveis de ambiente obrigatórias (`AI_PROVIDER`, `OPENAI_API_KEY` ou `GEMINI_API_KEY`, `CORS_ORIGIN`).
4. Faça deploy do serviço web.

## Detalhes do runner E2E
O script `npm run test:e2e` utiliza um runner parametrizavel em `scripts/run-playwright-e2e.mjs` que:
1. Inicia o servidor backend Express em nodeEnv=test.
2. Aguarda o health check em `/api/health` (até 120s).
3. Executa a suite Playwright contra a instancia de teste.
4. Finaliza o servidor com graceful shutdown (SIGTERM/taskkill).
5. Retorna o codigo de saida do Playwright (0 = sucesso).

Esse padrão resolve incompatibilidades do webServer da config do Playwright no Windows.

## Observacoes de producao
- Nao versionar `.env` com chaves reais.
- Use HTTPS em producao.
- Configure `CORS_ORIGIN` com os dominios oficiais.
- Configure o provider de IA com chave valida antes do deploy.
