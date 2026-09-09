/**
 * Carrega o cadastro de endereços do IBGE (CNEFE) de uma cidade para o banco.
 *
 * Uma vez por cidade. O arquivo vem do FTP do IBGE, por município:
 *   .../Arquivos_CNEFE/CSV/Municipio/<UF>/<codigo>_<NOME>.zip
 *
 * Uso:  tsx scripts/importar-ibge.ts <arquivo.csv> <UF> "<Cidade>"
 *
 * O CSV é ISO-8859-1 e separado por ponto e vírgula. Colunas que interessam:
 *   10 DSC_LOCALIDADE (bairro)   13 NOM_SEGLOGR (rua)   14 NUM_ENDERECO
 *   26 LATITUDE                  27 LONGITUDE
 */
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { chaveDeLogradouro } from '../src/core/services/geocodificador-local';

const [, , arquivo, uf, cidade] = process.argv;
if (!arquivo || !uf || !cidade) {
  console.error('uso: tsx scripts/importar-ibge.ts <arquivo.csv> <UF> "<Cidade>"');
  process.exit(1);
}

const cidadeChave = chaveDeLogradouro(cidade);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const texto = readFileSync(arquivo, 'latin1');
  const linhas = texto.split('\n');
  const cab = linhas[0].split(';').map((c) => c.trim());
  const col = (nome: string) => cab.indexOf(nome);
  const iBairro = col('DSC_LOCALIDADE');
  const iRua = col('NOM_SEGLOGR');
  const iNum = col('NUM_ENDERECO');
  const iLat = col('LATITUDE');
  const iLng = col('LONGITUDE');

  /*
   * Deduplica (rua, bairro, número): o censo tem várias faces do mesmo número, e
   * uma por chave basta para interpolar. Guardar em memória e inserir em lote é
   * muito mais rápido que 86 mil idas ao banco.
   */
  const vistos = new Map<string, { ruaChave: string; bairroChave: string; numero: number; lat: number; lng: number }>();

  for (let i = 1; i < linhas.length; i++) {
    const campos = linhas[i].split(';');
    if (campos.length <= iLng) continue;

    const rua = campos[iRua]?.trim();
    const lat = Number(campos[iLat]);
    const lng = Number(campos[iLng]);
    if (!rua || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const ruaChave = chaveDeLogradouro(rua);
    if (ruaChave.length < 3) continue;

    const bairroChave = chaveDeLogradouro(campos[iBairro] ?? '');
    const numero = parseInt(campos[iNum], 10) || 0;

    const chave = `${ruaChave}|${bairroChave}|${numero}`;
    if (!vistos.has(chave)) vistos.set(chave, { ruaChave, bairroChave, numero, lat, lng });
  }

  const registros = [...vistos.values()];
  console.log(`  linhas lidas, ${registros.length} endereços únicos`);

  // Recarrega do zero para a cidade: reimportar não duplica.
  await prisma.enderecoIbge.deleteMany({ where: { uf, cidadeChave } });

  const lote = 5000;
  for (let i = 0; i < registros.length; i += lote) {
    await prisma.enderecoIbge.createMany({
      data: registros.slice(i, i + lote).map((r) => ({ uf, cidadeChave, ...r })),
    });
    process.stdout.write(`\r  gravados ${Math.min(i + lote, registros.length)}/${registros.length}`);
  }
  console.log(`\n  pronto: ${cidade}/${uf}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
