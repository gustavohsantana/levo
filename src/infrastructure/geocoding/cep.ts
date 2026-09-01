/**
 * Consulta de CEP nos Correios, via ViaCEP.
 *
 * Existe porque digitar endereço no celular é o maior atrito do cardápio — e
 * porque endereço digitado à mão erra. Erro de digitação vira pedido sem pino
 * no mapa, e aí o motoboy sai sem saber para onde vai.
 *
 * O CEP resolve os dois: menos toques e endereço padronizado, que o
 * geocodificador acerta muito mais.
 */
export interface EnderecoDoCep {
  cidade: string;
  estado: string;
  bairro: string;
  rua: string;
}

const VIACEP = 'https://viacep.com.br/ws';

export async function buscarCep(cepBruto: string): Promise<EnderecoDoCep | null> {
  const cep = cepBruto.replace(/\D/g, '');
  if (cep.length !== 8) return null;

  /*
   * Teto de 4s: o cliente está com o dedo no formulário. Melhor cair para a
   * digitação manual do que deixá-lo olhando um campo travado.
   */
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 4_000);

  try {
    const resposta = await fetch(`${VIACEP}/${cep}/json/`, {
      signal: controle.signal,
      headers: { accept: 'application/json' },
    });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as {
      erro?: boolean | string;
      localidade?: string;
      uf?: string;
      bairro?: string;
      logradouro?: string;
    };

    // CEP inexistente volta 200 com `erro: true` — não como status HTTP.
    if (dados.erro) return null;
    if (!dados.localidade) return null;

    /*
     * Bairro e rua vêm vazios em CEP único de cidade pequena, que cobre o
     * município inteiro. Não é falha: devolvemos o que veio e o cliente
     * completa. Recusar aqui tiraria o ganho justamente de quem mais digita.
     */
    return {
      cidade: dados.localidade,
      estado: dados.uf ?? '',
      bairro: dados.bairro ?? '',
      rua: dados.logradouro ?? '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}
