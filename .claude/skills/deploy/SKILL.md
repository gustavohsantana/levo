---
name: deploy
description: >-
  Põe o Levô no ar e diagnostica deploy quebrado — Vercel (app) + Neon
  (Postgres) + OSRM público. Use quando o pedido envolver "deploy", "pôr no
  ar", "publicar", "Vercel", "Neon", "o site caiu", "não consigo logar em
  produção", "build falhou", ou quando for preciso ler log de runtime da
  Vercel. Contém as armadilhas já pagas: cada uma custou um ciclo de build e
  em nenhuma o sintoma aponta para a causa.
---

# Deploy do Levô

Arquitetura de demonstração: **Vercel** serve o Next.js, **Neon** é o Postgres,
o roteirizador é o **OSRM público**. O worker do iFood/aiqfome não sobe — é
processo separado e as integrações nascem desligadas por feature flag.

## Antes de qualquer coisa: você tem rede?

Sessões do Claude Code na web rodam atrás de um proxy que bloqueia
`console.neon.tech`, `vercel.com` e `*.vercel.app` com **403 no CONNECT**. Se
`curl -sS https://vercel.com` falhar assim, você não vai conseguir autenticar
nem ler log — pare e diga ao usuário que isto precisa de uma sessão local.

Rodando local, siga em frente: os CLIs autenticam pelo navegador.

```bash
npm i -g vercel neon
vercel login
neon auth
```

## Estado esperado

| Peça | Onde | Observação |
|---|---|---|
| App | Vercel, projeto `levo` | build roda `prisma generate && next build` |
| Banco | Neon, branch `main` | precisa de migrations **e** seed |
| Rotas | `https://router.project-osrm.org` | só demonstração; ver README |

Login de demonstração: `ze@pizzaria.com.br` / `pizzaria123`. Ele **vem do
seed** — banco sem seed não tem usuário, e a tela dirá que a senha está errada.

## Preparar o banco

Migration precisa da conexão **direta**; a aplicação usa a **pooled** (com
`-pooler` no host). Trocar as duas é um erro clássico: a pooled passa por
PgBouncer em modo transação e não segura o lock de migration.

```bash
neon connection-string          # direta, por padrão
DATABASE_URL="<direta>" npm run db:deploy
DATABASE_URL="<direta>" npm run db:seed
```

`db:seed` **apaga tudo e recria**. Nunca rode contra um banco com dado real.

## Variáveis na Vercel

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string **pooled** do Neon, com `?sslmode=require` |
| `AUTH_SECRET` | 32+ caracteres aleatórios |
| `PUBLIC_BASE_URL` | a URL do deploy, sem barra no fim |
| `OSRM_BASE_URL` | `https://router.project-osrm.org` |
| `GEOCODER_USER_AGENT` | `levo-demo (contato)` |

Todo o resto pode ficar em branco — `src/env.ts` descarta variável vazia antes
de validar, então campo em branco no painel se comporta como ausente.

Variável nova só vale em build novo: sempre `vercel --prod` ou Redeploy depois
de mexer.

## Armadilhas já pagas

Estas três já estão corrigidas no código. Se voltarem, o sintoma engana:

1. **`ENOENT: .next/next-server.js.nft.json`** depois de compilar tudo. É o
   `output: 'standalone'` brigando com o `modifyConfig` da Vercel. O
   `next.config.ts` condiciona em `process.env.VERCEL` — não remova.
2. **`Configuração inválida: OSRM_BASE_URL: Invalid URL`** no boot, numa
   variável opcional que tem default. É campo em branco virando `""`, que não é
   `undefined`. Coberto por `tests/infrastructure/env.test.ts`.
3. **`deployment was blocked because the commit email ... could not be matched
   to a GitHub account`**. O autor do commit precisa resolver para uma conta do
   GitHub. Use `<id>+<usuário>@users.noreply.github.com`, que casa sempre.

## Diagnosticar login quebrado

A mensagem diz de que tipo é o erro. Isto vem de
`src/presentation/http/error-mapper.ts`:

| O usuário vê | Significa |
|---|---|
| "E-mail ou senha inválidos" | `DomainError` — credencial mesmo, ou banco sem seed |
| **"Algo deu errado. Tente novamente."** | **exceção não tratada** — infraestrutura, não credencial |

O segundo caso é sempre bug ou conexão. O erro real foi registrado com
`console.error('[erro-nao-tratado]', cause)`:

```bash
vercel logs <url-do-deploy> --follow
# reproduza o login e procure [erro-nao-tratado]
```

Depois case a causa:

| No log | Causa | Correção |
|---|---|---|
| `ECONNREFUSED`, `ETIMEDOUT` | Neon inacessível ou string errada | conferir `DATABASE_URL` |
| SSL / `no encryption` | falta `?sslmode=require` | acrescentar à string |
| `relation "User" does not exist` | migration não rodou | `db:deploy` na conexão direta |
| `Timed out fetching a new connection` | usou a **direta** em serverless | trocar pela **pooled** |
| login OK mas rota falha | OSRM | conferir `OSRM_BASE_URL` |

Banco vazio e string errada dão erros diferentes — leia o log antes de chutar.

## Verificar no fim

Não confie em "buildou". Abra o site e rode o fluxo:

1. entrar com o login de demonstração
2. marcar os pedidos, **escolher um motoboy** (o botão fica desabilitado sem
   isso, com o motivo no `title`), otimizar
3. conferir que o link de rastreio começa com o `PUBLIC_BASE_URL`, não com
   `localhost` — este falha em silêncio, e é o que vai por WhatsApp ao cliente

Havendo Playwright, dirija o navegador e **olhe a captura**. Página em branco é
falha, não sucesso.
