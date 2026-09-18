-- Um pedido pode sair da loja de três jeitos, não dois: nosso motoboy leva
-- (DELIVERY), o cliente busca (PICKUP), ou o entregador da própria plataforma
-- busca (PLATFORM — 99Food, iFood, aiqfome).
--
-- Só o ALTER TYPE. O `migrate dev` queria trazer junto um DROP INDEX em Product
-- e um DROP DEFAULT em OrderItem.options — drift que já existia entre o schema
-- e o banco, sem relação com isto. O índice sustenta a ordenação do catálogo.

-- AlterEnum
ALTER TYPE "OrderFulfillment" ADD VALUE 'PLATFORM';
