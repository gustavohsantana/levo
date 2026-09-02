-- Retirada no balcao.
--
-- Um pedido de retirada nao e um pedido de entrega com o endereco da loja: nao
-- entra em rota, nao paga taxa, e o "entregue" acontece quando o cliente
-- aparece. Campo proprio para nenhuma tela ter que adivinhar pelo endereco.
CREATE TYPE "OrderFulfillment" AS ENUM ('DELIVERY', 'PICKUP');

ALTER TABLE "Order" ADD COLUMN "fulfillment" "OrderFulfillment" NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE "Establishment" ADD COLUMN "pickupEnabled" BOOLEAN NOT NULL DEFAULT false;
