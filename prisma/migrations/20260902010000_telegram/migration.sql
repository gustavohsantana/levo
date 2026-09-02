-- Telegram como canal de aviso ao motoboy.
--
-- Bot do Telegram nao pode iniciar conversa: o motoboy toca no convite uma vez
-- e autoriza. E essa regra que torna o canal seguro — ninguem recebe de quem
-- nao autorizou, entao ninguem e banido por mandar.
ALTER TABLE "Courier" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "Courier" ADD COLUMN "telegramInviteCode" TEXT;
CREATE UNIQUE INDEX "Courier_telegramInviteCode_key" ON "Courier"("telegramInviteCode");

-- O canal fica na propria mensagem: a fila e a mesma, o adaptador e que muda.
ALTER TABLE "CourierNotification" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "CourierNotification" ADD COLUMN "destination" TEXT NOT NULL DEFAULT '';
UPDATE "CourierNotification" SET "destination" = "phone" WHERE "destination" = '';
