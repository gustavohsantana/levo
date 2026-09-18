#!/usr/bin/env bash
#
# Faz o worker dormir fora do horário de operação.
#
# ## Por que isto existe
#
# O Neon cobra por tempo de banco ACORDADO, e suspende sozinho depois de ~5
# minutos em silêncio. O worker pergunta algo ao banco a cada 30 segundos — para
# sempre. Resultado: o compute nunca chega aos 5 minutos de silêncio e fica
# ligado 24h por dia, inclusive às 4h da manhã com a loja fechada.
#
# Em setembro de 2026 isso queimou a cota do plano free no dia 17 e derrubou o
# banco de produção por completo. Com 0.25 CU:
#
#     24h/dia = 182 CU-hours/mês    (cota do free é 100)
#     14h/dia = 106 CU-hours/mês
#     13h/dia =  97 CU-hours/mês    ← cabe no free
#
# Cada hora a menos economiza ~US$ 0,80/mês no plano Launch.
#
# ## Isto é um remendo, e é honesto dizer
#
# A correção de verdade é o pedido entrar por WEBHOOK (iFood, aiqfome, 99Food e
# WhatsApp têm), e o worker virar só reconciliação. Aí o banco acorda quando
# existe pedido, e não para ouvir silêncio. Enquanto isso não fica pronto, este
# script corta o desperdício sem tocar em código.
#
# ⚠️  Com o worker parado NADA é importado. Só use uma janela em que as lojas
#    estão comprovadamente fechadas. Pedido de plataforma que chegar no período
#    entra no ciclo seguinte — e o aiqfome CANCELA pedido não lido em 10 minutos.
#
# Uso, dentro do SSH da VM:
#   sudo INICIO=10:00 FIM=00:00 bash worker-horario.sh
#
# Para desfazer:
#   sudo systemctl disable --now levo-worker-parar.timer levo-worker-subir.timer
#   sudo systemctl start levo-worker
set -euo pipefail

INICIO="${INICIO:-10:00}"
FIM="${FIM:-00:00}"

echo "── fuso horário ───────────────────────────────────────────"
# Timer do systemd usa o fuso do sistema. Numa VM em UTC, "00:00" seria 21h de
# Brasília — o worker morreria no meio do jantar. Fixar o fuso é o que faz o
# horário escrito aqui significar o que se espera, e ainda deixa o log legível.
sudo timedatectl set-timezone America/Sao_Paulo
echo "  agora: $(date '+%d/%m %H:%M %Z')"

criar_par() {
  local nome="$1" acao="$2" quando="$3" descricao="$4"

  sudo tee "/etc/systemd/system/levo-worker-${nome}.service" >/dev/null <<SERVICE
[Unit]
Description=${descricao}

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl ${acao} levo-worker
SERVICE

  sudo tee "/etc/systemd/system/levo-worker-${nome}.timer" >/dev/null <<TIMER
[Unit]
Description=${descricao} (agendamento)

[Timer]
OnCalendar=*-*-* ${quando}:00
# Sem Persistent: se a VM estava desligada na hora marcada, não faz sentido
# executar atrasado — o próximo horário resolve.
Persistent=false

[Install]
WantedBy=timers.target
TIMER
}

echo "── timers ─────────────────────────────────────────────────"
criar_par "subir"  "start" "$INICIO" "Sobe o worker do Levô no início da operação"
criar_par "parar"  "stop"  "$FIM"    "Para o worker do Levô fora da operação"

sudo systemctl daemon-reload
sudo systemctl enable --now levo-worker-subir.timer levo-worker-parar.timer

echo "── conferência ────────────────────────────────────────────"
systemctl list-timers 'levo-worker-*' --no-pager || true

cat <<FIM_MSG

Pronto. O worker sobe às ${INICIO} e para às ${FIM}, horário de Brasília.

⚠️  Se a VM reiniciar dentro da janela de silêncio, o systemd sobe o worker
    junto (ele está 'enabled') e ele roda até o próximo horário de parada.
    Custa algumas horas de compute, não quebra nada.

Para ver o que está valendo:   systemctl list-timers 'levo-worker-*'
Para parar na mão agora:       sudo systemctl stop levo-worker
FIM_MSG
