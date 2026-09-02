-- De onde veio cada posicao do entregador.
--
-- O padrao e APP porque todo ping existente veio da tela do motoboy: o caminho
-- do Telegram nasceu depois desta coluna nao existir.
ALTER TABLE "CourierPing" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'APP';
