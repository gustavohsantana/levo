-- Codigo de confirmacao de entrega.
--
-- O cliente recebe quatro digitos na tela de acompanhamento e dita ao
-- entregador. Sem isso, "entregue" e a palavra de uma pessoa so.
ALTER TABLE "Order" ADD COLUMN "deliveryCode" TEXT;
ALTER TABLE "Establishment" ADD COLUMN "requireDeliveryCode" BOOLEAN NOT NULL DEFAULT false;
