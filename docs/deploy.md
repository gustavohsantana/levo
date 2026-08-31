# Deploy

A aplicação vai para a Vercel; o worker, não (ver `infra/worker-setup.sh`).

## Armadilhas já pagas

Cada uma custou tempo, e em nenhuma o sintoma aponta para a causa.

### O deploy fica BLOCKED sem mensagem de erro no terminal

Sintoma: `vercel --prod` sobe os arquivos, imprime a URL de produção e o
processo trava esperando. Nenhum build acontece. Depois de muitos minutos, a
CLI morre com `fetch failed` — que parece problema de rede e não é.

Causa: a Vercel bloqueia o deploy quando o **autor do commit** não tem acesso
ao time. O motivo só aparece no JSON da API, não no terminal:

```json
"status": "BLOCKED",
"readyStateReason": "Git author <email> must have access to the team ...",
"seatBlock": { "blockCode": "TEAM_ACCESS_REQUIRED" }
```

Para ver isso: `vercel --prod --debug` e procure por `readyStateReason`.

Aconteceu porque não havia `user.email` configurado — nem no repositório, nem
global. O git então inventa um endereço a partir do hostname da máquina
(`gustavo@MacBook-Air-de-Gustavo.local`), que obviamente não é membro de time
nenhum. Nada avisa: `git commit` funciona, `git push` funciona, e o problema só
aparece no deploy.

Conserto:

```bash
git config user.email "o-email-da-conta-vercel"
```

E o commit no topo precisa ter sido feito **depois** disso — a Vercel olha o
autor do commit que está sendo publicado, não a conta que rodou a CLI.

### Outras

- **`npx prisma generate` durante o build local mata o worker que está rodando.**
  Ele carrega o cliente na memória ao subir; regenerar por baixo faz o processo
  falhar com `Cannot read properties of undefined`. Reinicie o worker depois.
- **Trocar variável de ambiente na Vercel não afeta quem já está no ar.**
  Precisa de um deploy novo para a mudança valer.
