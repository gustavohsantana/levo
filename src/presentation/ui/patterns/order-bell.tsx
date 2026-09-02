'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Bell, BellOff } from 'lucide-react';

export interface PedidoNaFila {
  id: string;
  cliente: string;
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
export function SinoDePedidos({ novos }: { novos: PedidoNaFila[] }) {
  const ligado = useSyncExternalStore(assinar, lerPreferencia, () => false);
  const [semSom, setSemSom] = useState(false);

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
          : 'text-ink-faint hover:bg-raised hover:text-ink-muted'
      }`}
    >
      <Icone className="size-3.5 shrink-0" aria-hidden />
      {ligado ? (semSom ? 'avisos sem som' : 'avisos ligados') : 'avisar de pedido novo'}
    </button>
  );
}
