'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Bell, BellOff } from 'lucide-react';
import { currency, timeAgo } from '../format';

export interface PedidoNaFila {
  id: string;
  cliente: string;
  /** Só o balão da barra lateral usa. A cozinha manda sem. */
  valorCentavos?: number;
  criadoEm?: string;
}

/**
 * Quem entrou na fila desde a última olhada.
 *
 * `conhecidos` nulo marca a primeira passada, e nela ninguém é novidade: abrir
 * o painel com seis pedidos esperando tocaria seis vezes, e o dono desligaria o
 * sino no primeiro dia. O que se aprende na primeira passada é só a régua.
 */
export function novidades(
  conhecidos: Set<string> | null,
  fila: PedidoNaFila[],
): { chegaram: PedidoNaFila[]; conhecidos: Set<string> } {
  const agora = new Set(fila.map((o) => o.id));
  return {
    chegaram: conhecidos === null ? [] : fila.filter((o) => !conhecidos.has(o.id)),
    conhecidos: agora,
  };
}

/*
 * A escolha do sino mora fora do React.
 *
 * Ela vem do localStorage, que não existe no servidor: lida direto na primeira
 * renderização daria divergência de hidratação, e lida num efeito daria um
 * `setState` de partida. `useSyncExternalStore` resolve os dois — o servidor
 * responde "desligado" e o cliente relê assim que hidrata.
 */
const CHAVE = 'levo:sino';
const assinantes = new Set<() => void>();

function assinar(aoMudar: () => void) {
  assinantes.add(aoMudar);
  return () => void assinantes.delete(aoMudar);
}

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return false; // Navegador com armazenamento bloqueado.
  }
}

function gravarPreferencia(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao');
  } catch {
    /* Sem armazenamento a escolha vale só nesta aba. */
  }
  assinantes.forEach((aoMudar) => aoMudar());
}

/**
 * O aviso de pedido novo, para quem não está olhando o painel.
 *
 * O caso real não é o dono encarando a tela — é ele no iFood, no WhatsApp ou no
 * caixa, com o Levô numa aba atrás. Sem som, o pedido fica parado até alguém
 * lembrar de conferir, e o cliente já está ligando.
 *
 * Avisa por três caminhos ao mesmo tempo, porque cada um falha de um jeito: o
 * som não sai se o volume estiver mudo, a notificação não aparece se o sistema
 * estiver com "não perturbe", e o título da aba é o único que sobrevive à aba
 * escondida — mas só se a pessoa olhar.
 */
export function SinoDePedidos({
  novos,
  /**
   * Contador e balão. Ligado na barra lateral, desligado na cozinha.
   *
   * Na cozinha os pedidos já estão todos na tela, em colunas grandes: um balão
   * repetindo a mesma lista seria ruído em cima do que a pessoa já está vendo.
   */
  comLista = false,
}: {
  novos: PedidoNaFila[];
  comLista?: boolean;
}) {
  const ligado = useSyncExternalStore(assinar, lerPreferencia, () => false);
  const [semSom, setSemSom] = useState(false);
  const [aberto, setAberto] = useState(false);

  /*
   * O que este navegador já viu.
   *
   * Precisa ser ref e não estado: entra na comparação do próprio efeito que o
   * atualiza, e como estado provocaria um ciclo de renderizações.
   */
  const conhecidos = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const naoVistos = useRef(0);
  const tituloOriginal = useRef('');

  useEffect(() => {
    tituloOriginal.current = document.title;
  }, []);

  /**
   * Destrava o áudio. Só funciona dentro de um gesto do usuário.
   *
   * Navegador nenhum toca som sem um clique antes. Devolve se conseguiu, para
   * o botão poder ser honesto sobre estar ligado mas mudo.
   */
  const destravarSom = useCallback(async () => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current ??= new Ctx();
      await audio.current.resume();
      return audio.current.state === 'running';
    } catch {
      return false;
    }
  }, []);

  /*
   * Depois de um F5, o sino volta ligado mas o som volta travado.
   *
   * A preferência sobrevive ao recarregamento; a permissão de tocar áudio, não.
   * Sem isto o dono veria "avisos ligados" e não ouviria nada — pior que o sino
   * desligado, porque ele confiaria. Então o primeiro clique em qualquer lugar
   * do painel destrava, e o dono nunca fica sabendo que houve um problema.
   */
  useEffect(() => {
    if (!ligado || audio.current?.state === 'running') return;

    const aoPrimeiroGesto = () => void destravarSom().then((ok) => setSemSom(!ok));
    document.addEventListener('pointerdown', aoPrimeiroGesto, { once: true });
    document.addEventListener('keydown', aoPrimeiroGesto, { once: true });

    return () => {
      document.removeEventListener('pointerdown', aoPrimeiroGesto);
      document.removeEventListener('keydown', aoPrimeiroGesto);
    };
  }, [ligado, destravarSom]);

  const tocar = useCallback(() => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== 'running') return;

    /*
     * Duas notas, uma sexta acima: soa como aviso e não como erro. Três notas
     * já viram toque de celular, e num salão cheio o dono passa a ignorar.
     */
    const inicio = ctx.currentTime;
    for (const [i, hz] of [880, 1318.5].entries()) {
      const osc = ctx.createOscillator();
      const volume = ctx.createGain();
      const t = inicio + i * 0.13;

      osc.type = 'sine';
      osc.frequency.value = hz;
      // Rampa exponencial: subida seca estala no alto-falante.
      volume.gain.setValueAtTime(0.0001, t);
      volume.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      osc.connect(volume).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    }
  }, []);

  const marcarTitulo = useCallback(() => {
    document.title =
      naoVistos.current > 0
        ? `(${naoVistos.current}) ${tituloOriginal.current}`
        : tituloOriginal.current;
  }, []);

  /* Chegou alguém novo na fila? */
  useEffect(() => {
    const passo = novidades(conhecidos.current, novos);
    conhecidos.current = passo.conhecidos;

    if (passo.chegaram.length === 0 || !ligado) return;

    tocar();

    /*
     * O contador no título é só para quem está de costas.
     *
     * Com a aba à vista o pedido já apareceu na fila e o som já tocou — somar
     * ali deixaria um "(3)" pendurado até a pessoa trocar de aba e voltar, que
     * é justamente o gesto que ela não vai fazer se nunca saiu.
     */
    if (document.hidden) {
      naoVistos.current += passo.chegaram.length;
      marcarTitulo();
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      /*
       * `tag` fixa: numa rajada de quatro pedidos o sistema empilharia quatro
       * avisos, e limpar isso é trabalho que o dono não pediu. Um só, sempre
       * com a contagem do momento.
       */
      new Notification(
        passo.chegaram.length === 1 ? 'Pedido novo' : `${passo.chegaram.length} pedidos novos`,
        { body: passo.chegaram.map((o) => o.cliente).join(', '), tag: 'levo-pedido' },
      );
    }
  }, [novos, ligado, tocar, marcarTitulo]);

  /* Voltou para a aba: já viu. */
  useEffect(() => {
    const aoVoltar = () => {
      if (document.hidden) return;
      naoVistos.current = 0;
      marcarTitulo();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [marcarTitulo]);

  const alternar = async () => {
    if (ligado) {
      gravarPreferencia(false);
      naoVistos.current = 0;
      marcarTitulo();
      return;
    }

    /*
     * O clique que liga o sino é o mesmo que destrava o som — e é justamente
     * por isso que o sino não pode vir ligado de fábrica, por melhor que fosse.
     */
    const comSom = await destravarSom();
    setSemSom(!comSom);
    if (comSom) tocar();

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    gravarPreferencia(true);
  };

  const Icone = ligado ? Bell : BellOff;

  if (!comLista) {
    return (
      <button
        type="button"
        onClick={alternar}
        aria-pressed={ligado}
        title={
          ligado
            ? 'Avisar quando chegar pedido — clique para desligar'
            : 'Ligar o aviso sonoro de pedido novo'
        }
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition hairline ${
          ligado
            ? 'bg-accent-soft text-accent-ink'
            : 'text-ink-muted hover:bg-raised hover:text-ink'
        }`}
      >
        <Icone className="size-3.5 shrink-0" aria-hidden />
        {ligado ? (semSom ? 'avisos sem som' : 'avisos ligados') : 'avisar de pedido novo'}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        title={
          novos.length === 0
            ? 'Nenhum pedido esperando'
            : `${novos.length} ${novos.length === 1 ? 'pedido esperando' : 'pedidos esperando'}`
        }
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        <Icone className="size-4 shrink-0" aria-hidden />
        Avisos
        {novos.length > 0 ? (
          /*
           * O número conta quem está esperando, não quem chegou agora.
           *
           * "Chegaram 2" some sozinho e vira nada; "3 parados na fila" é o que
           * ainda cobra uma decisão, e é o que faz o dono clicar.
           */
          <span className="numeric ml-auto rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent-deep">
            {novos.length}
          </span>
        ) : null}
      </button>

      {aberto ? (
        <>
          {/*
            Camada invisível atrás do balão: clicar em qualquer lugar fecha.
            Sem ela o balão fica preso na tela até acertarem o botão de novo.
          */}
          <button
            type="button"
            aria-label="Fechar avisos"
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="dialog"
            aria-label="Pedidos esperando"
            className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg bg-surface shadow-lg hairline"
          >
            <div className="max-h-80 overflow-y-auto">
              {novos.length === 0 ? (
                <p className="px-3 py-4 text-sm text-ink-faint">Nenhum pedido esperando.</p>
              ) : (
                novos.map((pedido) => (
                  <Link
                    key={pedido.id}
                    href="/dashboard"
                    onClick={() => setAberto(false)}
                    className="flex items-baseline gap-2 px-3 py-2 transition hover:bg-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{pedido.cliente}</span>
                      {pedido.criadoEm ? (
                        <span className="text-xs text-ink-faint">{timeAgo(pedido.criadoEm)}</span>
                      ) : null}
                    </span>
                    {pedido.valorCentavos != null ? (
                      <span className="numeric shrink-0 text-sm text-ink-muted">
                        {currency(pedido.valorCentavos)}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>

            {/*
              O som mora aqui dentro, e não num botão à parte: é ajuste de uma
              vez por turno, e não merece um lugar fixo ao lado do que muda o
              tempo todo.
            */}
            <button
              type="button"
              onClick={alternar}
              aria-pressed={ligado}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-xs text-ink-muted transition hover:bg-raised"
            >
              <Icone className="size-3.5 shrink-0" aria-hidden />
              {ligado ? (semSom ? 'Tocar som — bloqueado' : 'Tocar som ao chegar') : 'Tocar som ao chegar'}
              <span
                className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  ligado ? 'bg-accent-soft text-accent-ink' : 'bg-line text-ink-faint'
                }`}
              >
                {ligado ? 'ligado' : 'desligado'}
              </span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
