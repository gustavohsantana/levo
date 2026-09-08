-- Acesso do motoboy ao app: usuario e senha gerados pelo dono.
--
-- O link /m/{token} continua valendo. Isto e o caminho do dia a dia e o que a
-- Play Store pede para o revisor entrar sem receber WhatsApp da loja.
ALTER TABLE "Courier" ADD COLUMN "login" TEXT;
ALTER TABLE "Courier" ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "Courier_login_key" ON "Courier"("login");
