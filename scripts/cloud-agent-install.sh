#!/usr/bin/env bash
# Bootstrap idempotente do Levô para Cloud Agents.
#
# Roda depois do checkout, na fase `install`. Prepara tudo o que a aplicação
# precisa para subir: PostgreSQL local, arquivo .env, dependências, schema e
# dados de demonstração. Pode rodar mais de uma vez sem quebrar nada.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 1. PostgreSQL — não há Docker no VM do agente, então instalamos o pacote e
#    usamos o cluster nativo. A instalação só acontece na primeira vez.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi
sudo pg_ctlcluster 16 main start 2>/dev/null || true

# Espera o socket ficar pronto antes de mexer no banco.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

# Role e banco que a aplicação espera (batem com o DATABASE_URL do .env.example).
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='levo'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE levo WITH LOGIN PASSWORD 'levo' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='levo'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE levo OWNER levo;"

# 2. Arquivo .env (fora do git). Gera um AUTH_SECRET de desenvolvimento uma vez.
if [ ! -f .env ]; then
  cp .env.example .env
  secret="$(openssl rand -base64 32)"
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"${secret}\"|" .env
fi

# 3. Dependências (o postinstall roda `prisma generate`).
npm install

# 4. Schema e dados de demonstração. `db:deploy` só aplica migrations pendentes;
#    o seed limpa e recria a Pizzaria do Zé, então é seguro rodar de novo.
npm run db:deploy
npm run db:seed

echo "Bootstrap concluído. Login: ze@pizzaria.com.br / pizzaria123"
