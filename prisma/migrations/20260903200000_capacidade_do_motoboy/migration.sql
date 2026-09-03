-- Quantos pedidos este motoboy leva por viagem.
--
-- Antes era 15 fixo no codigo, com o comentario "cabe num bau de moto". So que
-- quem entrega de carro leva mais, quem entrega de bicicleta leva bem menos, e
-- uma marmitaria nao tem o mesmo volume por pedido que uma lanchonete.
--
-- Default 15 preserva exatamente o comportamento atual de quem ja usa.
ALTER TABLE "Courier" ADD COLUMN "maxStops" INTEGER NOT NULL DEFAULT 15;
