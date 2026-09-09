-- O cadastro de enderecos do IBGE, por cidade.
--
-- Cada linha e um endereco real do censo: rua, bairro, numero e coordenada. E o
-- que o OpenStreetMap nao tem no interior. Carregado por cidade (uma vez), e
-- consultado pelo geocodificador antes de recorrer a qualquer API externa.
--
-- A chave de busca e (uf, cidade, rua, bairro) normalizados — o bairro entra
-- porque cidade tem rua de mesmo nome em lugares diferentes.
CREATE TABLE "EnderecoIbge" (
    "id"          TEXT NOT NULL,
    "uf"          TEXT NOT NULL,
    "cidadeChave" TEXT NOT NULL,
    "ruaChave"    TEXT NOT NULL,
    "bairroChave" TEXT NOT NULL,
    "numero"      INTEGER NOT NULL DEFAULT 0,
    "lat"         DOUBLE PRECISION NOT NULL,
    "lng"         DOUBLE PRECISION NOT NULL,
    CONSTRAINT "EnderecoIbge_pkey" PRIMARY KEY ("id")
);

-- A busca do geocodificador: rua num bairro de uma cidade.
CREATE INDEX "EnderecoIbge_busca_idx" ON "EnderecoIbge" ("uf", "cidadeChave", "ruaChave", "bairroChave");

-- Para desambiguar bairro quando o cliente nao informou: quais bairros tem a rua.
CREATE INDEX "EnderecoIbge_rua_idx" ON "EnderecoIbge" ("uf", "cidadeChave", "ruaChave");
