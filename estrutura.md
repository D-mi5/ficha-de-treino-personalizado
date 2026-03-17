# Estrutura do Projeto

## Pastas e Arquivos

- `src/types.ts`: Tipos de dados de entrada da cliente e resposta.
- `src/prompt.ts`: Prompt profissional com base cientifica para gerar treino feminino.
- `src/agents.ts`: Integracao com OpenAI.
- `src/metrics.ts`: Calculo de IMC, intensidade e progressao semanal.
- `src/pdf.ts`: Geracao de ficha em PDF.
- `src/history.ts`: Gerenciamento de historico de fichas por cliente.
- `src/middleware.ts`: Middleware de autenticacao por clientId (cookie).
- `src/server.ts`: API Express e rotas.
- `frontend/index.html`: Landing page com CTA iniciar.
- `frontend/form.html`: Formulario da cliente.
- `frontend/result.html`: Pagina de resposta da ficha.
- `frontend/offline.html`: Pagina exibida quando nao houver conexao.
- `frontend/scripts/form.js`: Captura e envio de dados para pagina de resultado.
- `frontend/scripts/result.js`: Chamada do backend, exibicao da resposta e historico local offline.
- `frontend/scripts/sync.js`: Modulo de sincronizacao com servidor.
- `frontend/scripts/pwa.js`: Registro PWA e instalacao do app.
- `frontend/styles/input.css`: Estilos Tailwind + tema visual.
- `frontend/sw.js`: Service worker com cache e fallback offline.
- `frontend/manifest.webmanifest`: Manifesto PWA.
- `frontend/assets/icons/`: Icones da aplicacao (192px e 512px).
- `.env`: Variaveis de ambiente.
- `.gitignore`: Arquivos ignorados no Git.
- `package.json`: Dependencias e scripts.
- `tsconfig.json`: Configuracao TypeScript.

## Fluxo

1. Cliente entra na landing e clica em Iniciar.
2. Cliente preenche formulario e gera treino.
3. Dados vao para backend via rota `/api/generate-workout`.
4. Backend monta prompt tecnico e envia para IA.
5. IA retorna ficha organizada em A/B/C/D com distribuicao semanal.
6. Resultado aparece na terceira pagina.
7. Ficha e salva localmente e sincronizada com servidor (se online).
8. Cliente pode baixar a ficha em PDF.
9. Em modo offline, o app mostra tela sem conexao e tenta gerar novamente quando a internet voltar.
10. Historico local fica acessivel mesmo sem internet; sincroniza com servidor quando conectado.

## Sincronizacao

- Cada cliente recebe um `clientId` unico em cookie (30 dias).
- Fichas geradas sao salvas localmente e sincronizadas com servidor.
- O servidor usa `/api/history` para recuperar historico do cliente.
- O endpoint `/api/history/sync` mescla historicos local e servidor, mantendo apenas as unicas.
- Limite de historico: 10 fichas por cliente.

## Rodar localmente

1. `npm install`
2. Preencher `.env` com chave da OpenAI.
3. `npm run dev`
4. Abrir `http://localhost:3000`
