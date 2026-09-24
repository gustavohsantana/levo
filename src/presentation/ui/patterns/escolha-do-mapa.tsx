'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '../cn';
import {
  APP_DE_MAPA_INICIAL,
  CHAVE_DO_MAPA,
  appDeMapaGuardado,
  type AppDeMapa,
} from '../navegacao';

/**
 * Google Maps ou Waze, neste aparelho.
 *
 * A preferência mora no `localStorage`, não na loja: dois motoboys da mesma
 * casa abrem apps diferentes, e trocar de celular não pode herdar a escolha
 * do outro. Sem valor gravado, fica o que o "Navegar" já abria — Google Maps.
 *
 * `useSyncExternalStore` porque o armazenamento não existe no servidor. Ler
 * direto no render divergiria a hidratação; um efeito com `setState` piscaria
 * o botão errado antes de corrigir.
 */
const assinantes = new Set<() => void>();

/** Vale quando o navegador recusa o armazenamento: a escolha dura nesta aba. */
let memoria: AppDeMapa | null = null;

function assinar(aoMudar: () => void) {
  assinantes.add(aoMudar);
  if (assinantes.size === 1) window.addEventListener('storage', noStorage);
  return () => {
    assinantes.delete(aoMudar);
    if (assinantes.size === 0) window.removeEventListener('storage', noStorage);
  };
}

function noStorage(evento: StorageEvent) {
  if (evento.key !== CHAVE_DO_MAPA && evento.key !== null) return;
  assinantes.forEach((fn) => fn());
}

function lerMapa(): AppDeMapa {
  try {
    return appDeMapaGuardado(localStorage.getItem(CHAVE_DO_MAPA));
  } catch {
    return memoria ?? APP_DE_MAPA_INICIAL;
  }
}

function gravarMapa(app: AppDeMapa) {
  memoria = app;
  try {
    localStorage.setItem(CHAVE_DO_MAPA, app);
  } catch {
    /* A memória da aba segura a escolha até fechar. */
  }
  assinantes.forEach((fn) => fn());
}

export function useMapaPadrao(): readonly [AppDeMapa, (app: AppDeMapa) => void] {
  const mapa = useSyncExternalStore(assinar, lerMapa, () => APP_DE_MAPA_INICIAL);
  return [mapa, gravarMapa];
}

const OPCOES = [
  ['google', 'Google Maps'],
  ['waze', 'Waze'],
] as const;

export function EscolhaDoMapa({ embutido = false }: { embutido?: boolean }) {
  const [mapa, escolher] = useMapaPadrao();

  return (
    <div className={embutido ? undefined : 'border-b px-4 py-3'}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Navegar com</p>
      <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Aplicativo de navegação">
        {OPCOES.map(([valor, rotulo]) => {
          const ativo = mapa === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => escolher(valor)}
              className={cn(
                'min-h-12 rounded-lg px-3 text-base font-medium transition',
                ativo ? 'bg-accent text-accent-ink' : 'bg-raised text-ink-muted',
              )}
            >
              {rotulo}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-faint">Vale só neste aparelho.</p>
    </div>
  );
}
