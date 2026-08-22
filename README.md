# Levô

Gestão de rotas para estabelecimentos que entregam com **motoboy próprio**.

Restaurantes pequenos recebem pedidos por iFood e aiqfome, mas entregam com a
moto da casa. Hoje isso é gerido no papel: o dono anota os endereços, entrega um
maço para o motoboy, e ele decide a ordem de cabeça. O Levô recebe os pedidos,
**calcula a melhor ordem das entregas**, põe a rota no celular do motoboy, mostra
a posição dele ao vivo para o dono e gera um **link de WhatsApp** para o cliente
acompanhar em tempo real.

---

## Começar

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Entre em <http://localhost:3000> com **ze@pizzaria.com.br** / **pizzaria123**.

### Roteirizador

O cálculo de rota precisa de um servidor OSRM. Duas opções:

```bash
# Produção e piloto — OSRM de verdade, com o mapa da região do cliente
./infra/osrm-prepare.sh https://download.geofabrik.de/south-america/brazil/sul-latest.osm.pbf
docker compose --profile osrm up -d osrm

# Desenvolvimento sem Docker — rotas em linha reta, NÃO serve para o piloto
node infra/osrm-stub.mjs
```

> Não aponte para `router.project-osrm.org` num negócio de verdade. A política de
> uso do servidor público proíbe uso comercial sistemático, e um *rate limit* no
> sábado à noite custa o cliente.

---

## As três telas

Não são a mesma aplicação, e não se parecem de propósito.

| | Painel do dono | App do motoboy | Rastreio do cliente |
|---|---|---|---|
| Rota | `/dashboard` | `/m/<token>` | `/t/<token>` |
| Contexto | balcão, correria | uma mão, sol na tela, luva | sofá, 20 segundos |
| Densidade | alta | uma decisão por vez | uma informação só |
| Tema | claro | **escuro** — roda de noite | do sistema |
| Acesso | e-mail e senha | link, sem senha | link, sem senha |

Motoboy e cliente entram por **link com token de 128 bits**, não por login. Senha
não sobrevive a esse público: é esquecida, anotada num papel ou dividida entre
três pessoas. O link entra no WhatsApp, que é onde eles já estão.

---

## Arquitetura

```
core  ←  application  ←  infrastructure
                     ←  presentation
```

`core` não importa nada — nem Prisma, nem Next, nem Zod. É TypeScript puro.

**Isso é verificado, não combinado.** `npm run arch` roda no CI e quebra o build
se alguém importar infraestrutura dentro do domínio. Arquitetura que não é
checada por ferramenta vira decoração em três meses.

### Por que a separação se paga aqui

O iFood exige polling **a cada 30 segundos**. O cron da Vercel tem granularidade
mínima de 1 minuto — o poller não pode viver dentro do Next.js. Precisa ser
processo separado (`worker/poller.ts`).

Com o domínio isolado, esse worker importa o mesmo `ImportOrderFromSource` que o
webhook usa: mesma regra, mesma idempotência, dois runtimes, zero duplicação.

### Onde fica o quê

```
src/
  core/            entidades, value objects, eventos, erros, ports
  application/     casos de uso e schemas Zod
  infrastructure/  Prisma, OSRM, geocodificador, adapters, WhatsApp
  presentation/    design system, queries, server actions
  app/             rotas Next.js
worker/            poller do iFood/aiqfome
infra/             docker-compose, OSRM, stub de desenvolvimento
```

### O que mata repetição

| Problema | Solução |
|---|---|
| `try/catch` em toda rota | **um** `error-mapper` traduz `DomainError` → HTTP |
| Validação duplicada | schemas Zod compartilhados entre cliente e servidor |
| Container de DI | fábricas simples em `composition-root.ts` |
| Cache espalhado | `CachedGeocoder` é decorator — o caso de uso nem sabe |
| Escrita parcial | `UnitOfWork` sobre `$transaction` |
| Filtro de tenant esquecido | repositórios já nascem com o escopo; extensão do Prisma barra o resto |
| API REST para o próprio frontend | Server Components chamam o caso de uso direto |

---

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | unitários — memória, sem banco, ~2s |
| `npm run test:integration` | integração contra Postgres real |
| `npm run arch` | **prova a regra de dependência** |
| `npm run typecheck` | tipos |
| `npm run worker` | poller das plataformas |
| `npm run db:seed` | dados de demonstração |

---

## Integrações

**Nem iFood nem aiqfome liberam API sem credenciamento.** Ambos exigem conta com
CNPJ e homologação de parceiro — semanas de processo.

Por isso a integração **não é o caminho crítico**. Existem três portas de
entrada, e o produto é vendável antes de qualquer homologação sair:

1. **Manual** — formulário no painel. É o que funciona no dia 1.
2. **Webhook genérico** — `POST /api/webhooks/orders`, autenticado por HMAC.
   Conecta hoje qualquer PDV, Zapier ou script.
3. **Adapters** — iFood e aiqfome implementam a mesma port `OrderSource`.
   Escritos contra a documentação, com o mapeamento testado, **desligados por
   feature flag** até sair o credenciamento.

```bash
EST=11111111-1111-1111-1111-111111111111
BODY='[{"externalId":"PDV-1","customerName":"Maria Silva",
        "address":"Rua Trajano Reis, 300 - São Francisco, Curitiba",
        "amountCents":8990}]'

# A assinatura cobre o estabelecimento junto com o corpo: sem isso, quem tem a
# chave de um estabelecimento poderia injetar pedidos na conta de outro.
SIG=$(printf '%s.%s' "$EST" "$BODY" \
  | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/api/webhooks/orders \
  -H "content-type: application/json" \
  -H "x-levo-establishment: $EST" \
  -H "x-levo-signature: $SIG" \
  -d "$BODY"
```

Reenviar o mesmo lote é inofensivo: a importação é idempotente por
`(estabelecimento, origem, id externo)`, garantida por constraint no banco. Isso
não é zelo excessivo — o polling do iFood reentrega evento por projeto, e pedido
duplicado põe **entrega fantasma no baú do motoboy**.

---

## Rodar o piloto de graça

| Peça | Grátis | Limite |
|---|---|---|
| Servidor (app + worker + OSRM + Postgres) | Oracle Cloud Always Free | ARM até 4 vCPU / 24 GB, permanente |
| Geocodificação | LocationIQ | 5.000/dia |
| Tiles do mapa | OpenStreetMap | uso leve |
| WhatsApp | links `wa.me` | sempre grátis |
| Erros | Sentry | 5.000 eventos/mês |
| CI | GitHub Actions | 2.000 min/mês |

Total: **R$ 0**. Único gasto opcional é domínio `.com.br` (~R$40/ano) — vale a
pena, porque o link de rastreio vai por WhatsApp e um endereço estranho parece
golpe.

---

## Decisões que parecem exageradas com um cliente só

E que seriam caras demais para consertar depois.

- **`establishmentId` em toda tabela.** Migrar dado de produção para
  multi-tenant é a pior tarde de trabalho que existe. Row-Level Security entra
  no segundo cliente; o schema já nasce compatível.
- **Idempotência desde o primeiro commit.** Ver acima.
- **Log append-only de eventos de domínio.** Um mecanismo, três retornos:
  métricas do piloto (`/admin/piloto`), auditoria, e a base para processamento
  assíncrono quando escalar.
- **Retenção do trajeto do motoboy.** É a tabela mais escrita do sistema e o
  primeiro gargalo real de escala. A mesma medida atende à LGPD.
- **Botão de imprimir a rota.** Se o sistema cair no pico, o dono não pode parar
  de vender. O papel volta — agora com a ordem certa. É a diferença entre um
  susto e um cliente perdido.
- **Fila offline no app do motoboy.** A internet dele cai. Sem isso ele vê um
  erro vermelho, volta para o papel, e o produto morre em campo mesmo
  funcionando no escritório.

## O que ainda não existe

Pagamento, app nativo, múltiplas lojas por conta, janelas de entrega, atribuição
automática de motoboy e relatórios financeiros.

### Limites conhecidos

- **A trava de força bruta do login conta em memória do processo.** Na
  implantação recomendada (uma VM só) funciona. Em serverless com várias
  instâncias, o limite efetivo é multiplicado pelo número delas. Migra para
  Redis junto com as filas, no segundo cliente integrado.
- **Row-Level Security ainda não está ligado.** O escopo de estabelecimento é
  garantido pelo desenho dos repositórios e por uma extensão do Prisma que
  barra consulta sem filtro. A garantia dura vem com RLS — gatilho: segundo
  cliente.
- **Os adapters de iFood e aiqfome nunca falaram com a API real**, porque isso
  exige CNPJ e homologação. O mapeamento tem teste; o transporte, não.
- **O GPS do navegador para com a tela bloqueada.** O motoboy precisa manter o
  app aberto. Resolver de verdade exige app nativo ou Capacitor.
- **`npm audit` acusa 3 vulnerabilidades altas, e o conserto automático é pior
  que a doença.** A cadeia é `prisma → @prisma/config → deepmerge-ts`
  (exaustão de pilha ao mesclar grafos recursivos). O `prisma` é
  devDependency: isso roda na CLI e no build, lendo o `prisma.config.ts` que
  nós mesmos escrevemos — não há entrada de terceiro nesse caminho, e nada
  disso vai para o runtime. O `npm audit fix --force` propõe **prisma
  6.12.0**, um downgrade de major que quebra o `prisma.config.ts`, cujo
  import `prisma/config` só existe no 7. Não rode. Sai sozinho quando o
  Prisma atualizar o `deepmerge-ts` para >= 8.
