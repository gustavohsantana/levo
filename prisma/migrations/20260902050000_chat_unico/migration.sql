-- Uma conversa do Telegram pertence a um entregador so.
--
-- A unicidade permite `findUnique`, que e como o webhook descobre de quem e a
-- posicao sem ja saber o estabelecimento. O tenant-guard recusa `findFirst` sem
-- escopo — e recusou, com 500 no webhook, ate esta migracao existir.
CREATE UNIQUE INDEX "Courier_telegramChatId_key" ON "Courier"("telegramChatId");
