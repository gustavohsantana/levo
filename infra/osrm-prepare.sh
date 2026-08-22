#!/usr/bin/env bash
#
# Prepara o roteirizador local. Roda uma vez (ou quando quiser atualizar o mapa).
#
#   ./infra/osrm-prepare.sh https://download.geofabrik.de/south-america/brazil/sul-latest.osm.pbf
#
# Escolha o menor extract que cubra a região do cliente em
# https://download.geofabrik.de/south-america/brazil.html — para um único
# estabelecimento, a região metropolitana já basta, e quanto menor o arquivo
# mais rápido o pré-processamento e menos RAM o servidor consome.
set -euo pipefail

URL="${1:-https://download.geofabrik.de/south-america/brazil/sul-latest.osm.pbf}"
DATA_DIR="$(cd "$(dirname "$0")" && pwd)/osrm-data"
IMAGE="osrm/osrm-backend:latest"

mkdir -p "$DATA_DIR"

echo "==> Baixando extract: $URL"
curl -L --fail --progress-bar -o "$DATA_DIR/region.osm.pbf" "$URL"

run() { docker run --rm -v "$DATA_DIR:/data" "$IMAGE" "$@"; }

echo "==> Extraindo grafo (perfil: carro)"
run osrm-extract -p /opt/car.lua /data/region.osm.pbf

echo "==> Particionando"
run osrm-partition /data/region.osrm

echo "==> Customizando"
run osrm-customize /data/region.osrm

echo
echo "Pronto. Suba com:  docker compose --profile osrm up -d osrm"
