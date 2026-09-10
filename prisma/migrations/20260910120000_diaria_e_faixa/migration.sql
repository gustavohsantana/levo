-- Novo acordo de pagamento: diaria garantida + valor por faixa de distancia.
--
-- Enum aditivo: nenhum motoboy existente muda de modelo, e o valor so passa a
-- ser aceito onde o codigo ja sabe lidar (fecharPagamento soma diaria e faixa).
ALTER TYPE "CourierPayModel" ADD VALUE IF NOT EXISTS 'DIARIA_E_FAIXA';
