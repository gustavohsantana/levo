-- Pedir a localizacao ao vivo do motoboy pelo Telegram.
--
-- Desligado por padrao. O dono decide se quer acompanhar, e o motoboy ainda
-- decide se compartilha: o bot pede, nunca liga sozinho.
ALTER TABLE "Establishment" ADD COLUMN "telegramLocation" BOOLEAN NOT NULL DEFAULT false;
