'use server';

import { put } from '@vercel/blob';
import { env } from '@/env';
import { requireSession } from './http/session';

/**
 * Foto do produto.
 *
 * Guardar imagem no banco engorda cada consulta com bytes que ninguém precisa
 * na maioria das telas, então o arquivo vai para um armazenamento próprio e o
 * produto guarda só o endereço. É o mesmo campo que a importação do iFood
 * preenche — de lá vem a URL da imagem que já está hospedada por eles.
 */
export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/** 4 MB: foto de celular cabe, e é o teto do corpo de uma Server Action. */
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function enviarImagemAction(formData: FormData): Promise<UploadResult> {
  const arquivo = formData.get('file');

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, error: 'Escolha uma imagem.' };
  }

  /*
   * Tipo e tamanho conferidos aqui, não só no `accept` do input: o atributo do
   * HTML é conveniência para quem escolhe o arquivo, e não impede ninguém de
   * mandar outra coisa direto na requisição.
   */
  if (!TIPOS.includes(arquivo.type)) {
    return { ok: false, error: 'Formato não aceito. Use JPG, PNG ou WebP.' };
  }

  if (arquivo.size > TAMANHO_MAXIMO) {
    return { ok: false, error: 'Imagem muito grande. O limite é 4 MB.' };
  }

  if (!env().BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: 'Envio de imagem não configurado neste ambiente.' };
  }

  try {
    const session = await requireSession();

    const enviado = await put(
      // O estabelecimento no caminho separa as imagens por dono, e o
      // `addRandomSuffix` evita que dois produtos com o mesmo nome de arquivo
      // sobrescrevam a foto um do outro.
      `produtos/${session.establishmentId}/${arquivo.name}`,
      arquivo,
      { access: 'public', addRandomSuffix: true },
    );

    return { ok: true, url: enviado.url };
  } catch (cause) {
    return { ok: false, error: `Não consegui enviar a imagem: ${String(cause).slice(0, 120)}` };
  }
}
