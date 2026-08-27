# Pagamento online no cardápio

Pesquisa e decisão de arquitetura para receber pagamento em `/cardapio/[slug]`.
Nada disto está implementado — o documento existe para que a implementação
comece por uma decisão já tomada, e não por uma comparação de tabelas de taxa
feita às pressas no meio do código.

---

## Onde estamos hoje

O cardápio já fecha pedido, mas não cobra. O cliente escolhe os itens, preenche
endereço, escolhe **como pretende pagar**, e o pedido cai no painel do dono com
origem `SITE`. O dinheiro é cobrado na porta.

O que já existe e que a integração vai aproveitar:

| Peça | Onde | Serve para |
|---|---|---|
| `Order.paymentMethod` (`CASH`/`CREDIT`/`DEBIT`/`PIX`/`ONLINE`) | `prisma/schema.prisma` | O enum já prevê `ONLINE` |
| `Order.amountCents` / `deliveryFeeCents` | idem | Valor em centavos, calculado no servidor |
| Preço vindo do catálogo, nunca do carrinho | `src/application/use-cases/orders/create-order.ts` | Sem isso, cobrar online seria cobrar o que o navegador mandasse |
| `IntegrationCredential` + `CredentialStore` | `src/infrastructure/integrations/credential-store.ts` | Token OAuth por estabelecimento, cifrado com `AUTH_SECRET`, com renovação |
| Fluxo OAuth completo | `src/app/api/integrations/aiqfome/{connect,callback}/route.ts` | O molde exato do "conectar a conta da loja" |
| Webhook assinado com evento gravado antes de processar | `src/app/api/integrations/ifood/webhook/route.ts` | O molde exato do webhook de pagamento |
| `@@unique([establishmentId, source, externalId])` | `prisma/schema.prisma` | Idempotência já é hábito da casa |

Ou seja: a parte difícil de um gateway em SaaS multi-tenant — guardar credencial
de terceiro por loja, renovar, e receber webhook assinado sem duplicar efeito —
já foi construída duas vezes neste repositório. Pagamento é a terceira.

---

## A decisão que define todo o resto: de quem é a conta que recebe

Existem dois desenhos possíveis, e eles não são variações do mesmo tema.

**A) O Levô recebe e repassa.** Uma conta só, o dinheiro dos pedidos de todas as
lojas entra nela, e o Levô devolve para cada uma. Simples de programar e
péssimo de tudo o mais: vira intermediador de pagamento perante o Banco Central,
o faturamento das lojas passa a transitar no CNPJ do Levô com a consequência
fiscal que isso tem, todo chargeback e toda reclamação de cliente viram
problema do Levô, e o dono da pizzaria só vê o dinheiro quando você repassar.
Um sistema de gestão de entregas não tem por que assumir risco de crédito.

**B) Cada loja recebe na própria conta; o Levô só integra.** A loja autoriza o
Levô por OAuth, o Levô cria a cobrança usando o token **dela**, o dinheiro cai
direto na conta **dela**, e o Levô recebe o webhook para saber que entrou. É o
mesmo modelo já usado para iFood e aiqfome no repositório: a credencial é do
lojista, guardada por estabelecimento.

**Vai ser o B.** Não é preferência de estilo: o desenho A muda a natureza
jurídica do produto, e o schema já foi feito para o B (`IntegrationCredential`
existe justamente porque "com dois estabelecimentos, cada um traz o seu").

Consequência prática: **split de pagamento não é requisito.** Ele só faria
sentido se o Levô cobrasse comissão por pedido, e o produto cobra mensalidade.
Isso elimina metade dos critérios pelos quais gateways costumam ser comparados —
e elimina o Pagar.me e o Asaas subconta da disputa, porque a força deles é
exatamente o que não vamos usar.

---

## Os candidatos

Taxas de tabela pública consultadas em 2026; são negociáveis por volume e
**quem paga é a loja, não o Levô** — o que muda o peso do critério: importa mais
que o lojista já tenha ou consiga a conta em cinco minutos do que 0,2% de
diferença.

| Gateway | Pix | Cartão (online) | Conecta conta de terceiro | Veredito |
|---|---|---|---|---|
| **Mercado Pago** | ~0,99%, D+0 | ~3,98% (D+30) a ~4,98% (D+0) | **Sim, OAuth `authorization_code`** | **Escolhido** |
| Pagar.me (Stone) | ~0,99% | ~2,69%–3,19% | Via cadastro de recebedores, não OAuth de conta existente | Melhor para marketplace com split; overkill aqui |
| Asaas | ~1,00% | ~2,99% | Subconta white-label, com período de avaliação regulatória e gerente de contas | Cria conta *nova* para a loja; atrito de onboarding alto |
| AbacatePay | R$ 0,80 fixo | — | Conta única | Taxa imbatível, mas empurra para o desenho A |
| PagBank | ~1,09% | ~3,79%+ | Split limitado | Sem vantagem que justifique |
| Stripe | Pix só sob convite no Brasil | — | Connect | Fora: Pix é o método que importa aqui |

O que decide a favor do Mercado Pago não é a taxa, são três coisas:

1. **OAuth de conta existente.** O lojista clica em "conectar", faz login numa
   conta que ele provavelmente já tem, autoriza, e acabou. Nenhum concorrente
   entrega esse fluxo com esse atrito. No Asaas o lojista abre uma conta nova e
   manda documento; para uma pizzaria de bairro isso é onde a integração morre.
2. **É a conta que o público-alvo já tem.** Pizzaria com maquininha
   Point/Mercado Pago é o caso comum, não o exótico. Conectar não é adotar uma
   ferramenta nova, é ligar a que já está lá.
3. **O molde já está no repositório.** `authorization_code`, token com validade,
   refresh token, credencial cifrada por estabelecimento: é o aiqfome de novo,
   trocando o endereço do endpoint.

### Onde o Mercado Pago é ruim, e por que aceitamos

- Taxa de cartão alta (até ~4,98% no D+0). Não vamos oferecer cartão online na
  primeira versão — ver abaixo.
- Documentação espalhada por vários domínios e versões, com trechos
  contraditórios. Vale checar a data de cada página antes de copiar código.
- A API mudou: **`/v1/orders` substituiu `/v1/payments`** para checkout
  transparente. O `/v1/payments` continua funcionando, mas a própria Mercado
  Pago marca esse caminho como não recomendado e diz que novidade só sai em
  Orders. Integração nova nasce em `/v1/orders` — a maior parte do que se acha
  em blog e em resposta de modelo ainda é `/v1/payments`.

---

## Primeira versão: só Pix, e pagar continua sendo opcional

Duas restrições de escopo que valem mais que qualquer detalhe de implementação.

**Só Pix.** Cartão online custa de quatro a cinco vezes mais caro para a loja,
traz chargeback (o cliente contesta depois de comer), exige antifraude e uma
tela de cartão com PCI a considerar. Pix custa ~1%, cai na hora, é irreversível
e é o que o cliente de delivery já usa. Cartão fica para depois, se pedirem — e
aí o caminho é o mesmo endpoint, com o Brick de cartão no front.

**Pagar online não substitui pagar na entrega, convive com ele.** Delivery de
bairro tem cliente que não paga antes, e transformar o pagamento em obrigação
derruba pedido. O checkout passa a ter duas opções:

- **Pagar agora (Pix)** — QR Code e copia-e-cola na própria tela, confirmação
  automática.
- **Pagar na entrega** — dinheiro, cartão na maquininha, ou Pix na porta. É o
  fluxo de hoje, sem mudança nenhuma.

E a opção de Pix online só aparece se o estabelecimento tiver conectado a conta.
Loja sem integração vê exatamente o cardápio de hoje.

---

## E cartão? Sim, e é a mesma conexão

Vale deixar registrado porque a pergunta aparece na hora errada, no meio da
implementação do Pix: **cartão pelo Mercado Pago, caindo direto na conta da
loja, funciona — e não exige nada de novo do lojista.**

A autorização OAuth devolve `access_token` **e** `public_key` da conta dele. É a
mesma credencial que o `CredentialStore` já vai guardar para o Pix. O lojista
conecta uma vez; aceitar cartão vira uma chave na tela de configurações, não uma
segunda integração. O dinheiro cai na conta dele, no prazo que ele escolheu lá
(D+0, D+14 ou D+30), com a taxa que ele negociou — o Levô não entra no meio em
nenhum ponto disso.

Dado de cartão nunca toca o servidor do Levô. O navegador tokeniza com o SDK do
Mercado Pago (Secure Fields ou o Brick de cartão), o que chega ao backend é um
`card_token` descartável, e o backend cria a order com o token da loja. O PCI
fica com o Mercado Pago. A regra que não pode ser quebrada: **número de cartão e
CVV não passam por `application/`, não vão para log, não entram no banco.**

### Por que cartão mesmo assim é a fase 4, e não a fase 2

Não é dificuldade de chamar o endpoint — é quase o mesmo `POST /v1/orders`. É
que Pix tem dois desfechos e cartão tem sete, e cinco deles aparecem depois que
o motoboy já saiu.

| | Pix | Cartão |
|---|---|---|
| Desfechos | pago / não pago | aprovado, em análise, recusado (dezenas de `status_detail`), desafio 3DS, estornado, contestado |
| Quando se sabe | segundos | segundos, **ou horas** (`in_process`) |
| Reversível | não | sim, semanas depois (`charged_back`) |
| Custo p/ a loja | ~0,99% | ~3,98% (D+30) a ~4,98% (D+0) |
| Antifraude | não se aplica | obrigatório fazer direito, ou a recusa vira pedido perdido |

Os três que dão trabalho de verdade:

- **`in_process`.** O pagamento fica em análise. O pedido não pode entrar em
  rota nem ser recusado — precisa de um terceiro estado no painel, com o dono
  sabendo o que fazer enquanto espera.
- **3DS 2.0.** Quando exigido, a resposta vem `pending_challenge` com um
  `external_resource_url` que precisa ser aberto em iframe no checkout. Sem
  tratar isso, uma fatia dos cartões simplesmente não paga, e o cliente vê uma
  tela travada.
- **`charged_back`.** Chega semanas depois, com a comida entregue. O prejuízo é
  da loja, não do Levô — mas o painel precisa mostrar, senão o dono descobre
  pelo extrato. E há prazo para enviar documentação de defesa.

### Device ID não é opcional

O script de segurança do Mercado Pago cria a variável global
`MP_DEVICE_SESSION_ID` no navegador. Esse valor tem que ir no header
`X-meli-session-id` da criação do pagamento **e** no campo `device.fingerprint`
da criação do `card_token`. Pular isso não quebra nada de forma visível: só
derruba a taxa de aprovação. E recusa em checkout de delivery não é um erro, é
um pedido perdido — o cliente vai pedir no iFood.

### A ambiguidade que precisa ser resolvida em sandbox

A documentação do Mercado Pago se contradiz sobre **qual `public_key` usar no
front** quando o pagamento é processado com o token do vendedor:

- A página de split 1:1 diz para usar a `public_key` **do integrador**.
- As páginas de "integrar checkout em marketplace" dizem para usar a
  `public_key` **do vendedor**, junto com o `access_token` dele.

Como não vamos usar split, a combinação coerente é **as duas credenciais da
mesma conta: `public_key` e `access_token` do vendedor**, ambas vindas do OAuth.
Mas isso é exatamente o tipo de coisa que só falha em produção — testar com
usuário de teste antes de prometer cartão para alguém.

### O atalho, se cartão virar urgente

Checkout Pro com o `access_token` da loja: redireciona o cliente para a página
do Mercado Pago, que resolve formulário, 3DS, device ID e antifraude, e devolve
o cliente ao site. O dinheiro vai para a conta da loja do mesmo jeito. Custa
muito menos código e zera a superfície de PCI; paga-se com conversão, porque
sair do site no celular no meio do pedido derruba parte dos clientes. É um
caminho legítimo para validar demanda antes de construir o checkout
transparente — e a decisão pode ser tomada depois, porque a conexão OAuth é a
mesma.

---

## O que muda no schema

Um enum, uma tabela e um campo. Nada em `Order` além de um status.

```prisma
enum IntegrationProvider {
  IFOOD
  AIQFOME
  MERCADO_PAGO   // novo
}

enum PaymentStatus {
  PENDING      // cobrança criada, QR na tela, ninguém pagou ainda
  PAID         // webhook confirmou
  EXPIRED      // o Pix venceu sem pagamento
  CANCELLED    // pedido cancelado antes de pagar
  REFUNDED     // estornado (loja fechada, item em falta)
  // Só acontecem com cartão. Nascem aqui, sem uso, porque acrescentar valor a
  // enum depois é migration em tabela de dinheiro — e porque o painel precisa
  // saber que esses estados existem antes de o primeiro aparecer.
  IN_REVIEW    // em análise do antifraude; não entra em rota, não é recusado
  REJECTED     // recusado pelo emissor ou pelo antifraude
  CHARGED_BACK // contestado depois da entrega
}

model Payment {
  id                String        @id @default(uuid())
  establishmentId   String
  orderId           String        @unique
  provider          IntegrationProvider
  // O id da cobrança no gateway. Único porque o webhook reentrega:
  // é o que impede confirmar o mesmo pagamento duas vezes.
  externalId        String
  status            PaymentStatus @default(PENDING)
  amountCents       Int
  qrCode            String?       // EMVCo, o "copia e cola"
  qrCodeBase64      String?
  expiresAt         DateTime?
  paidAt            DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  establishment Establishment @relation(fields: [establishmentId], references: [id], onDelete: Cascade)

  @@unique([provider, externalId])
  @@index([establishmentId, status])
}
```

Em `Order`, um campo só:

```prisma
  /// Nulo quando o pedido é para pagar na entrega — que continua sendo a maioria.
  paymentStatus PaymentStatus?
  payment       Payment?
```

`Payment` entra em `TENANT_SCOPED` no guard do Prisma
(`src/infrastructure/persistence/prisma/client.ts`). Uma tabela de dinheiro
escapar do filtro de estabelecimento é o pior lugar possível para esse
esquecimento.

Detalhe que não é detalhe: **`amountCents` do `Payment` é copiado do pedido no
momento da criação da cobrança e nunca mais muda.** Se alguém editar o pedido
depois, a comparação "valor pago × valor cobrado" ainda tem os dois lados.

---

## Onde cada arquivo entra

A arquitetura hexagonal do projeto já diz onde tudo mora; a integração não
inventa camada nova.

```
src/core/ports/services/index.ts          + interface PaymentGateway
src/core/entities/payment.ts              + entidade e máquina de estados
src/application/use-cases/payments/
  create-payment.ts                        cria a cobrança para um pedido
  confirm-payment.ts                       aplica o resultado do webhook (idempotente)
  expire-payments.ts                        vence Pix não pago
src/infrastructure/payments/mercadopago/
  gateway.ts                               POST /v1/orders com o token da loja
  oauth.ts                                 authorization_code + refresh
  signature.ts                             validação do x-signature
src/app/api/integrations/mercadopago/
  connect/route.ts                          espelho do aiqfome/connect
  callback/route.ts                         espelho do aiqfome/callback
src/app/api/webhooks/payments/mercadopago/route.ts
src/presentation/public-menu.ts            + criarPagamentoPixAction / consultarPagamentoAction
src/presentation/ui/patterns/public-menu.tsx  + tela de QR Code
src/composition-root.ts                    + os três casos de uso
```

O `PaymentGateway` como port existe por um motivo concreto, não por purismo: o
Mercado Pago é a escolha certa para o primeiro cliente, não uma verdade
permanente. Se um lojista já tiver Pagar.me ou InfinitePay, trocar precisa ser
um adapter novo e uma linha no composition root — que é como geocodificador e
roteirizador já funcionam aqui.

```ts
export interface PaymentGateway {
  createPixCharge(input: {
    establishmentId: string;
    orderId: string;
    amountCents: number;
    payerEmail?: string;
    expiresInMinutes: number;
  }): Promise<{ externalId: string; qrCode: string; qrCodeBase64: string; expiresAt: Date }>;

  getCharge(establishmentId: string, externalId: string): Promise<{ status: PaymentStatus; paidAt: Date | null; amountCents: number }>;

  refund(establishmentId: string, externalId: string): Promise<void>;
}
```

---

## O fluxo, ponta a ponta

### 1. O lojista conecta (uma vez)

`GET /api/integrations/mercadopago/connect` exige sessão — pelo mesmo motivo que
o aiqfome exige: o token que voltar será gravado no estabelecimento dele, e um
link solto conectaria a conta de um lojista ao estabelecimento de outro.
Redireciona para:

```
https://auth.mercadopago.com/authorization
  ?client_id=APP_ID&response_type=code&platform_id=mp
  &redirect_uri=...&state=...
```

O `state` é assinado pelo `issueOAuthState` que já existe. O callback troca o
código em `POST https://api.mercadopago.com/oauth/token` e grava via
`CredentialStore.save(establishmentId, 'MERCADO_PAGO', ...)`. O `access_token`
vale ~180 dias e vem com `refresh_token` (escopo `offline_access`), então o
`accessTokenFor` com renovação já resolve.

**Verificar no callback se a conta tem chave Pix cadastrada.** Sem chave, a
criação da cobrança falha depois — e o sintoma aparece no cliente do
restaurante, na hora do pedido, não na tela de configuração. Melhor recusar a
conexão com uma mensagem clara.

### 2. O cliente escolhe "pagar agora"

O pedido é criado primeiro, como hoje, com `paymentStatus = PENDING`, e só
depois a cobrança é gerada. Criar cobrança sem pedido deixaria dinheiro entrando
sem nada para associar quando o webhook chegasse.

O pedido nesse estado **não entra em rota e não conta como confirmado no
painel** — aparece numa faixa "aguardando pagamento". Isso é uma decisão de
produto, não técnica: um Pix que o cliente abandonou não pode virar uma parada
na rota do motoboy.

Cobrança criada com o token da loja:

```
POST https://api.mercadopago.com/v1/orders
Authorization: Bearer <access_token DA LOJA>
X-Idempotency-Key: <uuid derivado do orderId>

{
  "type": "online",
  "processing_mode": "automatic",
  "total_amount": "78.90",
  "external_reference": "<orderId>",
  "transactions": { "payments": [{
    "amount": "78.90",
    "payment_method": { "id": "pix", "type": "bank_transfer" },
    "expiration_time": "PT30M"
  }]},
  "payer": { "email": "..." }
}
```

Três campos que não são opcionais na prática:

- **`X-Idempotency-Key`** é obrigatório na API. Derivado do `orderId`, o clique
  duplo no botão não gera duas cobranças.
- **`external_reference`** carrega o `orderId`. É o que liga o webhook de volta
  ao pedido sem depender de lookup frágil.
- **`expiration_time`** define a validade. 30 minutos é o razoável para
  delivery: tempo de abrir o banco sem prender o pedido a noite inteira.

O `qr_code` (string EMVCo) e o base64 voltam na resposta e vão para a tela.

### 3. O cliente paga

Chega webhook em `POST /api/webhooks/payments/mercadopago`. O endpoint faz o
mínimo: valida assinatura, grava o evento, responde 200. Igual ao do iFood, e
pelo mesmo motivo — o gateway reentrega o que não confirmar rápido.

A validação **não é HMAC do corpo cru**, como no iFood. É diferente e é onde se
perde tarde:

```
template = `id:${dataId};request-id:${xRequestId};ts:${ts};`
v1 == HMAC_SHA256(template, webhookSecret)
```

`ts` e `v1` saem do header `x-signature`, `dataId` do query param `data.id`, e o
segredo é o gerado no painel em *Suas integrações → Webhooks*. Comparação em
tempo constante, como já se faz no `verifySignature` do iFood.

Depois, fora do caminho da resposta, o `ConfirmPayment`:

1. Busca o pagamento por `(provider, externalId)`.
2. **Consulta o status na API antes de acreditar.** O webhook diz "algo mudou no
   recurso X", não "está pago" — tratar a notificação como verdade é o buraco
   clássico.
3. Confere o valor contra `Payment.amountCents`. Divergiu, não confirma: marca
   para conferência humana.
4. Se já está `PAID`, não faz nada. Reentrega é normal, não exceção.
5. Marca `PAID`, grava `paidAt`, libera o pedido no painel, emite o evento de
   domínio.

### 4. O que a tela do cliente mostra

A tela do QR faz polling curto (3s) numa server action que lê o banco — não o
gateway. O webhook é quem fala com o Mercado Pago; a tela só observa o efeito.
Isso evita rajada de chamadas à API do gateway com dez clientes na tela ao mesmo
tempo.

Fallback obrigatório: se o webhook não chegar em ~20 segundos após o cliente
dizer que pagou, a action consulta a API diretamente uma vez. Webhook perdido em
serverless acontece, e o cliente com o comprovante na mão olhando uma tela
parada é a pior tela do produto.

### 5. Pix que ninguém pagou

Expira sozinho no gateway, mas o registro local também precisa vencer, senão o
painel acumula pedido fantasma. Duas saídas, e a escolha depende do deploy:

- Na VM (worker já roda de 30 em 30 segundos): um passo a mais no ciclo.
- Na Vercel: verificação preguiçosa na leitura do painel — `PENDING` com
  `expiresAt` no passado vira `EXPIRED` ao ser lido. Sem cron, sem processo.

Vale a pena começar pela preguiçosa: funciona nos dois deploys.

---

## Armadilhas específicas deste projeto

- **`PUBLIC_BASE_URL` precisa estar certo em produção.** O `redirect_uri` do
  OAuth e a URL do webhook derivam dele, como já acontece no aiqfome. Errado, o
  Mercado Pago recusa a autorização com mensagem genérica.
- **O `AUTH_SECRET` passa a proteger dinheiro.** Já cifra credencial de
  marketplace, mas trocá-lo agora deixa de ser "reconectar o iFood" e vira
  "nenhuma loja consegue cobrar". Está documentado no `CredentialStore`; a
  consequência muda de tamanho.
- **A rota do webhook não pode ficar atrás do rate limit em memória.** O
  `checkRateLimit` protege o cardápio; aplicá-lo ao webhook descartaria
  notificação de pagamento numa rajada.
- **Vercel e o rate limit em memória.** O README já registra que a trava do
  login conta por processo. Com pagamento entrando, isso deixa de ser detalhe do
  login: vale medir antes de prometer.
- **Testar com credencial de teste, não com a de produção.** O Mercado Pago tem
  usuários de teste e access token de teste; o `live_mode` vem na resposta do
  OAuth e deve ser guardado, para que o painel saiba distinguir "conectado em
  sandbox" de "conectado de verdade".
- **Pedido pago com a loja fechada.** Alguém vai pagar às 3h da manhã. É preciso
  ter estorno (`refund`) acessível no painel desde a primeira versão, senão a
  solução vira ligar para o cliente e fazer Pix de volta na mão.
- **`npm audit` e a cadeia do Prisma.** Já registrado no README como conhecido;
  com pagamento no escopo, isso vira conversa de auditoria, não de conveniência.

---

## O que não fazer

- **Pix estático com a chave da loja e comprovante no WhatsApp.** É o que a
  maioria das lanchonetes faz hoje, e é exatamente o trabalho manual que o
  produto deveria eliminar: alguém confere print, print é falsificável, e não há
  conciliação. Se a integração for isso, não vale o código.
- **Guardar chave Pix da loja num campo de texto.** Convida o desenho A pela
  porta dos fundos e não dá confirmação automática.
- **Cartão online na primeira versão.** É possível e usa a mesma conexão (ver
  acima), mas é onde estão os estados que aparecem depois da entrega. Entra
  quando Pix estiver de pé.
- **Guardar número de cartão ou CVV em qualquer lugar.** Tokenização no
  navegador não é sugestão de arquitetura, é o que mantém PCI fora do projeto.
- **Confiar no corpo do webhook.** Vale a consulta à API, sempre.
- **Split porque o gateway oferece.** O produto cobra mensalidade. Comissão por
  pedido é outra decisão de negócio, e não deve entrar de contrabando junto com
  uma escolha técnica.

---

## Entrega em fases

1. **Conectar.** `IntegrationProvider.MERCADO_PAGO`, OAuth connect/callback,
   card na tela de Integrações mostrando conectado/desconectado. Sem cobrar
   nada ainda. Fecha sozinha e é testável de ponta a ponta.
2. **Cobrar.** Migration de `Payment`, port `PaymentGateway`, adapter,
   `CreatePayment`, tela de QR no cardápio, polling. Pedido nasce `PENDING`.
3. **Confirmar.** Webhook assinado, `ConfirmPayment` idempotente com consulta à
   API, liberação do pedido no painel, expiração preguiçosa.
4. **Operar.** Estorno no painel, faixa "aguardando pagamento", pedido pago
   destacado para o motoboy (não cobrar de novo na porta é o erro óbvio a
   evitar), e o valor recebido no `/admin/piloto`.
5. **Cartão, se pedirem.** Chave por estabelecimento, tokenização no navegador,
   device ID, 3DS em iframe, e os estados `IN_REVIEW` / `REJECTED` /
   `CHARGED_BACK` no painel. Sem conexão nova: a credencial é a mesma da fase 1.

Fases 1 a 3 são o mínimo para valer a pena. A 4 é o que separa "funciona na
demo" de "funciona no sábado à noite". A 5 só depois que as quatro estiverem de
pé — cartão é onde mora a cauda longa de estados, e não é lugar de descobrir que
o webhook estava com problema.

---

## Decisões que dependem do dono do produto

1. Pagar online é opcional ou o dono pode tornar obrigatório? (Sugestão: chave
   por estabelecimento, padrão opcional.)
2. A taxa de entrega entra no Pix ou é cobrada à parte na porta? (Sugestão:
   entra — cobrar duas vezes é confuso.)
3. Prazo de expiração do Pix. (Sugestão: 30 min.)
4. Gorjeta para o motoboy no checkout — entra agora ou fica para depois?
5. O Levô vai querer comissão por pedido algum dia? Se sim, a resposta muda o
   desenho e é melhor saber antes da fase 2 do que depois.

---

## Fontes

- Mercado Pago — OAuth (authorization code, refresh, PKCE):
  <https://www.mercadopago.com.br/developers/pt/docs/security/oauth>
- Mercado Pago — Orders API, criar order (`X-Idempotency-Key`, Pix):
  <https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/create-order/post>
- Mercado Pago — Checkout Transparente via Orders, modelo de integração e aviso
  de que `/v1/payments` não é o caminho recomendado:
  <https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-model>
- Mercado Pago — notificações e validação de `x-signature`:
  <https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications>
- Mercado Pago — split 1:1 / marketplace (não usado; é também uma das duas
  páginas que se contradizem sobre a `public_key`):
  <https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace>
- Mercado Pago — integrar checkout em marketplace, a outra página da
  contradição (diz `public_key` do vendedor):
  <https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/how-tos/integrate-marketplace>
- Mercado Pago — device ID, fingerprint e recomendações de aprovação de cartão:
  <https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/improve-payment-approval/recommendations>
- Asaas — criação de subcontas e split:
  <https://docs.asaas.com/docs/criacao-de-subcontas> ·
  <https://docs.asaas.com/docs/split-de-pagamentos>
- AbacatePay — Pix com taxa fixa: <https://www.abacatepay.com/pix>
