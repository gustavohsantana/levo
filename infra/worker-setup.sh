#!/usr/bin/env bash
#
# Instala o worker do Levô numa VM Debian/Ubuntu limpa.
#
# Pensado para a e2-micro sempre gratuita do Google Cloud: 1 GB de RAM e
# 0,25 vCPU compartilhada. É pouco, e por isso o script cria swap antes de
# instalar dependências — sem ela, o `npm ci` é morto pelo kernel no meio.
#
# Uso, dentro do SSH da VM:
#   curl -fsSL <url-deste-arquivo> | bash
# ou cole o conteúdo inteiro no terminal.
#
# Depois de rodar, falta apenas preencher /etc/levo/worker.env e iniciar.
set -euo pipefail

REPO="${REPO:-https://github.com/gustavohsantana/levo.git}"
DESTINO=/opt/levo
USUARIO=levo

echo "── 1. swap ────────────────────────────────────────────────"
# 1 GB de RAM não sustenta `npm ci` deste projeto. O swap é lento, mas a
# alternativa é a instalação morrer sem explicação clara (OOM killer).
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "  2 GB de swap criados"
else
  echo "  swap já existe"
fi

echo "── 2. Node.js 22 ──────────────────────────────────────────"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs git
fi
echo "  node $(node -v)"

echo "── 3. usuário de serviço ──────────────────────────────────"
# Usuário próprio, sem shell: se o worker for comprometido, o atacante não
# ganha uma sessão nem acesso ao resto da máquina.
if ! id "$USUARIO" >/dev/null 2>&1; then
  sudo useradd --system --create-home --shell /usr/sbin/nologin "$USUARIO"
  echo "  usuário $USUARIO criado"
else
  echo "  usuário $USUARIO já existe"
fi

echo "── 4. código ──────────────────────────────────────────────"
if [ -d "$DESTINO/.git" ]; then
  sudo -u "$USUARIO" git -C "$DESTINO" pull --ff-only
else
  sudo mkdir -p "$DESTINO"
  sudo chown "$USUARIO":"$USUARIO" "$DESTINO"
  sudo -u "$USUARIO" git clone "$REPO" "$DESTINO"
fi

echo "── 5. dependências ────────────────────────────────────────"
# `npm ci` roda o postinstall (prisma generate), que exige DATABASE_URL. Como
# o .env ainda não existe, passamos um valor de fachada só para o generate:
# ele não conecta em nada, apenas valida o formato.
cd "$DESTINO"
sudo -u "$USUARIO" env DATABASE_URL="postgresql://x:x@localhost:5432/x" npm ci

echo "── 6. arquivo de ambiente ─────────────────────────────────"
sudo mkdir -p /etc/levo
if [ ! -f /etc/levo/worker.env ]; then
  sudo tee /etc/levo/worker.env >/dev/null <<'ENV'
# Credenciais do worker do Levô. Preencha e reinicie:
#   sudo systemctl restart levo-worker
DATABASE_URL=""
AUTH_SECRET=""
IFOOD_ENABLED="true"
IFOOD_CLIENT_ID=""
IFOOD_CLIENT_SECRET=""
AIQFOME_ENABLED="false"
OSRM_BASE_URL="https://router.project-osrm.org"
GEOCODER_BASE_URL="https://nominatim.openstreetmap.org"
GEOCODER_USER_AGENT="levo (contato)"
LOG_LEVEL="info"
NODE_ENV="production"
ENV
  echo "  /etc/levo/worker.env criado — PRECISA SER PREENCHIDO"
else
  echo "  /etc/levo/worker.env já existe, mantido"
fi
# Só o root lê: o arquivo tem a senha do banco e as credenciais do iFood.
sudo chmod 600 /etc/levo/worker.env

echo "── 7. serviço ─────────────────────────────────────────────"
sudo tee /etc/systemd/system/levo-worker.service >/dev/null <<SERVICE
[Unit]
Description=Levo — importacao de pedidos das plataformas
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USUARIO
WorkingDirectory=$DESTINO
EnvironmentFile=/etc/levo/worker.env
ExecStart=/usr/bin/npm run worker

# Reinicia sempre, com espera: plataforma fora do ar nao pode virar um laco
# de reinicio que consome a maquina inteira.
Restart=always
RestartSec=10

# Teto de memoria. Numa VM de 1 GB, um vazamento no worker derrubaria o
# sistema todo; assim o systemd mata so o worker e o reinicia.
MemoryMax=512M

# Endurecimento basico: sem acesso a /home, sem privilegios novos.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DESTINO

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable levo-worker

echo ""
echo "───────────────────────────────────────────────────────────"
echo "  Instalado. Faltam dois passos:"
echo ""
echo "  1. preencher as credenciais:"
echo "       sudo nano /etc/levo/worker.env"
echo ""
echo "  2. iniciar:"
echo "       sudo systemctl start levo-worker"
echo ""
echo "  Para acompanhar:"
echo "       sudo journalctl -u levo-worker -f"
echo "───────────────────────────────────────────────────────────"
