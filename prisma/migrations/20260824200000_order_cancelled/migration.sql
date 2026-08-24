-- AlterEnum
-- Cancelamento vindo da plataforma (iFood, aiqfome). Distinto de FAILED, que é
-- a entrega tentada e não concluída pelo motoboy.
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';
