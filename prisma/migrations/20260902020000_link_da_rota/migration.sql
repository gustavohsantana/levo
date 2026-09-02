-- O link da tela do motoboy, guardado a parte do texto.
--
-- No Telegram ele vira botao de Mini App — abre a tela dentro do aplicativo, em
-- tela cheia. Extrair do texto funcionaria hoje e quebraria no dia em que
-- alguem reescrevesse a mensagem.
ALTER TABLE "CourierNotification" ADD COLUMN "link" TEXT;
