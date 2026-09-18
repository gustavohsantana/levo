-- 99Food (DiDi Food) entra como provedor de integração e como origem de pedido.
--
-- "FOOD99" e não "99FOOD": valor de enum precisa ser identificador válido, e
-- identificador não começa com dígito.
--
-- Só os dois ALTER TYPE. O `migrate dev` queria trazer junto um DROP INDEX em
-- Product e um DROP DEFAULT em OrderItem.options — drift que já existia entre o
-- schema e o banco, sem relação com o 99Food. O índice sustenta a ordenação do
-- catálogo; derrubá-lo de carona numa migration de enum seria estragar uma
-- consulta quente por engano.

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'FOOD99';

-- AlterEnum
ALTER TYPE "OrderSourceKind" ADD VALUE 'FOOD99';
