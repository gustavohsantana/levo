import { Address, Coordinates, type Geocoder, type Logger } from '@/core';
import type { Regiao } from './address-query';
import {
  chaveDeLogradouro,
  coordenadaDoNumero,
  type PontoConhecido,
} from '@/core/services/geocodificador-local';
import { partesDoEndereco } from './address-query';
import type { getPrismaClient } from '@/infrastructure/persistence/prisma/client';

/**
 * Geocodifica pela base do IBGE carregada no banco.
 *
 * É o primeiro da cascata: se a cidade foi importada, ele acha o que o
 * OpenStreetMap não tem — as ruas do interior. Não achou (cidade não carregada,
 * rua ausente, bairro que não bate), devolve `null` e o próximo geocodificador
 * tenta. Nunca inventa: um ponto errado é pior que nenhum, porque manda o
 * motoboy com confiança para o lugar errado.
 */
export class IbgeGeocoder implements Geocoder {
  constructor(
    private readonly prisma: ReturnType<typeof getPrismaClient>,
    private readonly logger?: Logger,
  ) {}

  async geocode(address: Address, regiao?: Regiao): Promise<Coordinates | null> {
    const uf = regiao?.state?.trim().toUpperCase();
    const cidade = regiao?.city?.trim();
    if (!uf || !cidade) return null;

    const { rua, numero, bairro } = partesDoEndereco(address.raw);
    const ruaChave = chaveDeLogradouro(rua);
    if (ruaChave.length < 3) return null;

    const cidadeChave = chaveDeLogradouro(cidade);
    const bairroChave = chaveDeLogradouro(bairro);

    /*
     * Busca a rua na cidade. O bairro decide qual, quando há mais de uma com o
     * mesmo nome — foi o que os dados ensinaram: Pouso Alegre tem duas "Antônio
     * de Souza Gouveia", a 3 km uma da outra.
     */
    const daRua = await this.prisma.enderecoIbge.findMany({
      where: { uf, cidadeChave, ruaChave },
      select: { bairroChave: true, numero: true, lat: true, lng: true },
    });

    if (daRua.length === 0) return null;

    const pontos = this.desambiguar(daRua, bairroChave);
    if (!pontos) {
      // Rua em vários bairros e nenhum informado: não dá para escolher com
      // segurança. Melhor deixar o cliente marcar o pino que chutar o bairro.
      this.logger?.info({ rua, cidade }, 'ibge.bairro_ambiguo');
      return null;
    }

    const ponto = coordenadaDoNumero(numero, pontos);
    if (!ponto) return null;

    this.logger?.info({ rua, numero, bairro, cidade }, 'ibge.encontrado');
    return Coordinates.create(ponto.lat, ponto.lng);
  }

  /**
   * Escolhe os pontos do bairro certo.
   *
   * - Bairro informado e existe → os dele.
   * - Bairro informado mas não bate → tenta a rua inteira, se ela vive num
   *   bairro só (sem ambiguidade, o nome errado do cliente não atrapalha).
   * - Sem bairro → só resolve se a rua existe num bairro só.
   */
  private desambiguar(
    linhas: Array<{ bairroChave: string; numero: number; lat: number; lng: number }>,
    bairroChave: string,
  ): PontoConhecido[] | null {
    const bairros = new Set(linhas.map((l) => l.bairroChave));

    if (bairroChave && bairros.has(bairroChave)) {
      return linhas.filter((l) => l.bairroChave === bairroChave);
    }

    // A rua existe num bairro só: o bairro do cliente (errado ou ausente) não
    // muda a resposta.
    if (bairros.size === 1) return linhas;

    return null;
  }
}
