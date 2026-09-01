import { describe, expect, it, vi, afterEach } from 'vitest';
import { buscarCep } from '@/infrastructure/geocoding/cep';

/**
 * O CEP existe para tirar digitação do celular — e porque endereço digitado
 * erra, e erro de digitação vira pedido sem pino no mapa.
 */
afterEach(() => vi.unstubAllGlobals());

function respondeCom(corpo: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => corpo }));
}

describe('buscarCep', () => {
  it('devolve o endereço completo', async () => {
    respondeCom({
      localidade: 'Pouso Alegre',
      uf: 'MG',
      bairro: 'Pitangueiras',
      logradouro: 'Rua Rosa Campanella',
    });

    expect(await buscarCep('37556-040')).toEqual({
      cidade: 'Pouso Alegre',
      estado: 'MG',
      bairro: 'Pitangueiras',
      rua: 'Rua Rosa Campanella',
    });
  });

  /*
   * CEP unico de cidade pequena cobre o municipio inteiro e volta sem rua.
   * Recusar tiraria o ganho justamente de quem mais digita.
   */
  it('aceita CEP geral, sem rua nem bairro', async () => {
    respondeCom({ localidade: 'Careaçu', uf: 'MG', bairro: '', logradouro: '' });

    expect(await buscarCep('37545000')).toEqual({
      cidade: 'Careaçu',
      estado: 'MG',
      bairro: '',
      rua: '',
    });
  });

  /* O ViaCEP responde 200 com `erro: true` — não com status HTTP. */
  it('trata CEP inexistente, que vem como 200', async () => {
    respondeCom({ erro: true });
    expect(await buscarCep('00000-000')).toBeNull();
  });

  it('recusa CEP com número errado de dígitos, sem gastar rede', async () => {
    const espiao = vi.fn();
    vi.stubGlobal('fetch', espiao);

    expect(await buscarCep('123')).toBeNull();
    expect(espiao).not.toHaveBeenCalled();
  });

  it('devolve nulo quando a consulta falha, para a digitação seguir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));
    expect(await buscarCep('37556040')).toBeNull();
  });

  it('aceita CEP com máscara', async () => {
    respondeCom({ localidade: 'São Paulo', uf: 'SP', bairro: 'Bela Vista', logradouro: 'Avenida Paulista' });
    expect((await buscarCep('01310-100'))?.cidade).toBe('São Paulo');
  });
});
