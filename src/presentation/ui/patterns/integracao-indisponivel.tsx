import { AVISO_INTEGRACAO_SEM_CREDENCIAL } from '@/presentation/integracao-disponivel';

/**
 * O cartão de uma integração que este ambiente não pode ligar.
 *
 * Mesma frase do 99Food: o dono lê na tela de Integrações o que falta, sem
 * botão que falha e sem sair do painel.
 */
export function IntegracaoIndisponivel({ titulo }: { titulo: string }) {
  return (
    <div className="flex h-full flex-col rounded-lg bg-surface p-5 hairline">
      <h3 className="font-semibold text-ink">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        {AVISO_INTEGRACAO_SEM_CREDENCIAL}
      </p>
    </div>
  );
}
