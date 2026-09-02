-- Quanto o sistema acompanha cada motoboy.
--
-- CHECKIN e o padrao: a posicao e capturada quando ele confirma a entrega.
-- Prova onde ele estava, sem segui-lo o dia inteiro — e nao depende de ele
-- lembrar de ligar nada.
CREATE TYPE "CourierTracking" AS ENUM ('CHECKIN', 'CONTINUOUS');

ALTER TABLE "Courier" ADD COLUMN "tracking" "CourierTracking" NOT NULL DEFAULT 'CHECKIN';
-- Para a tela poder dizer POR QUE nao ha rastreio: recusar e ficar sem sinal
-- sao conversas diferentes.
ALTER TABLE "Courier" ADD COLUMN "trackingDeniedAt" TIMESTAMP(3);
