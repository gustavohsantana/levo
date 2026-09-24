#!/usr/bin/env bash
# Reconciliação por boot: garante o PostgreSQL de pé antes de app/worker.
#
# Roda na fase `start`, toda vez que o VM sobe. O cluster já existe (foi criado
# no install); aqui só o iniciamos de novo, de forma idempotente.
set -euo pipefail

sudo pg_ctlcluster 16 main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done
