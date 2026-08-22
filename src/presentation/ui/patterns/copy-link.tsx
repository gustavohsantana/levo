'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '../primitives';

/**
 * O motoboy recebe a rota por link no WhatsApp — não por login e senha.
 *
 * Senha não sobrevive a esse público: é esquecida, anotada num papel ou
 * compartilhada entre três pessoas. Um link com token de 128 bits é mais
 * seguro na prática e entra no fluxo que ele já usa.
 */
export function CopyLink({
  path,
  label,
  done,
}: {
  path: string;
  label: string;
  done: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Sem permissão de área de transferência (http em rede local, por
      // exemplo): mostrar o link é melhor que falhar em silêncio.
      window.prompt('Copie o link do motoboy:', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Button size="sm" variant="ghost" onClick={copy}>
      {copied ? done : <><Link2 />{label}</>}
    </Button>
  );
}
