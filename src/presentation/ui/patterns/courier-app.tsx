'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

/**
 * O que o app Android expõe para esta página.
 *
 * Minúscula de propósito: cada método aqui é código nativo, e código nativo só
 * se corrige reinstalando o APK em cada motoboy — enquanto a página se corrige
 * num deploy.
 */
interface PonteDoApp {
  rastrear(token: string): void;
  parar(): void;
  temPermissao(): boolean;
}
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronRight,
  CloudOff,
  LoaderCircle,
  MapPin,
  Navigation,
  Package,
  Phone,
  Route as RouteIcon,
  TriangleAlert,
} from 'lucide-react';
import type { DriverRouteView, DriverStopView } from '@/presentation/driver-queries';
import type { HistoricoDoDia as Historico } from '@/presentation/historico-do-motoboy';
import { Button } from '../primitives';
import { cn } from '../cn';
import { currency, phoneDisplay } from '../format';
import { googleMapsRouteUrl } from '../maps-link';
import { urlDeNavegacao, type AppDeMapa } from '../navegacao';
import { enqueue, flush } from '../offline-queue';
import { EscolhaDoMapa, useMapaPadrao } from './escolha-do-mapa';
import { HistoricoDoDia } from './historico-do-dia';

const PING_INTERVAL_MS = 15_000;

/**
 * A tela do motoboy.
 *
 * Nada aqui se parece com o painel do dono, de propósito — é outro contexto:
 * uma mão, moto parada, sol na tela, às vezes luva. As decisões que seguem daí:
 *
 *  • tema escuro fixo (roda de noite);
 *  • UMA parada em foco por vez, gigante — o resto é lista secundária;
 *  • botões de 56px+, que é o alvo confortável para polegar;
 *  • confirmação otimista com fila offline: o toque SEMPRE responde na hora,
 *    mesmo sem sinal;
 *  • sem senha — o link é a credencial.
 */
export function CourierApp({
  token,
  route,
  exigeCodigo = false,
  historico,
}: {
  token: string;
  route: DriverRouteView;
  /** A loja pede o código do cliente para fechar a entrega. */
  exigeCodigo?: boolean;
  /** Entregas concluídas hoje. `null` quando a consulta falhou. */
  historico: Historico | null;
}) {
  const router = useRouter();
  /** Qual bloco está em foco. Os dois continuam na página: a rota não sai. */
  const [aba, setAba] = useState<'rota' | 'hoje'>('rota');
  const [mapa] = useMapaPadrao();

  function irPara(proxima: 'rota' | 'hoje') {
    setAba(proxima);
    document.getElementById(proxima)?.scrollIntoView({ block: 'start' });
  }
  const [pendingSync, setPendingSync] = useState(0);
  /** Motivo pelo qual a fila não anda — mostrado ao motoboy, não engolido. */
  const [blocked, setBlocked] = useState<string | null>(null);
  /**
   * Conexão é estado que vive fora do React — o navegador é dono dele.
   * `useSyncExternalStore` é a API feita para exatamente isso: assina a fonte
   * externa sem espelhar o valor num estado local que pode ficar defasado, e
   * sem risco de divergir entre servidor e cliente na hidratação.
   */
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  /** Paradas confirmadas localmente e ainda não refletidas pelo servidor. */
  // `undefined` explícito: sem ele o TypeScript assume que todo id existe no
  // mapa e considera o fallback para o status do servidor código morto.
  const [resolvedLocally, setResolvedLocally] = useState<
    Record<string, 'DELIVERED' | 'FAILED' | undefined>
  >({});

  const stops = useMemo(
    () =>
      route.stops.map((stop) => ({
        ...stop,
        status: resolvedLocally[stop.id] ?? stop.status,
      })),
    [route.stops, resolvedLocally],
  );

  const pending = stops.filter((stop) => stop.status === 'PENDING');

  /*
   * A parada em foco não é obrigatoriamente a primeira.
   *
   * A rota é uma sugestão, não uma ordem: o prédio do 2 não atende, o cliente
   * do 3 ligou pedindo para chegar antes, a rua está interditada. Travar o
   * motoboy na sequência não impede nada disso — só faz ele resolver como já
   * resolvia antes do sistema existir: marcando tudo no fim, de memória, com o
   * horário errado.
   *
   * O foco volta sozinho para a primeira quando a escolhida sai da lista, e é
   * por isso que ele guarda o id e não o índice.
   */
  const [focoManual, setFocoManual] = useState<string | null>(null);
  const [replanejando, setReplanejando] = useState(false);
  /** O aparelho recusou a localização nesta sessão. */
  const [recusou, setRecusou] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);
  const current = pending.find((stop) => stop.id === focoManual) ?? pending[0] ?? null;
  const done = stops.length - pending.length;
  // Só o que falta entregar, na ordem que o OSRM definiu. Recalcular a cada
  // render é de graça no tamanho de uma rota, e memoizar aqui só criaria a
  // ilusão de cache: `pending` é um array novo toda vez.
  const mapsRoute = googleMapsRouteUrl(pending);

  // ── Sincronização da fila offline ──────────────────────────────────────
  const sync = useCallback(async () => {
    const result = await flush();
    setPendingSync(result.pending);
    setBlocked(result.pending > 0 ? result.blocked : null);
    if (result.sent > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    // `online` nas dependências de propósito: quando o sinal volta, o efeito
    // roda de novo e a fila esvazia na hora, sem esperar o próximo ciclo.
    const periodic = setInterval(sync, 20_000);
    const immediate = setTimeout(sync, 0);

    return () => {
      clearInterval(periodic);
      clearTimeout(immediate);
    };
  }, [sync, online]);

  // Rota ainda não liberada: o motoboy fica nesta tela até o dono confirmar a
  // saída, então ela precisa buscar a mudança sozinha.
  useEffect(() => {
    if (route.status !== 'PLANNED') return;
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [route.status, router]);

  /*
   * Dentro do app Android, quem rastreia é o serviço nativo.
   *
   * É a única coisa que a web não faz: posição com a tela apagada, que é como o
   * celular passa o turno — no bolso ou preso no guidão. A página continua sendo
   * a mesma nos dois lugares; ela só avisa o app quando a rota começa e quando
   * acaba, e o app cuida do resto.
   *
   * No navegador `LevoApp` não existe, e nada disso acontece.
   */
  useEffect(() => {
    const app = (window as unknown as { LevoApp?: PonteDoApp }).LevoApp;
    if (!app) return;

    if (route.status === 'IN_PROGRESS') app.rastrear(token);
    else app.parar();

    /*
     * Sem parar na desmontagem: sair da tela não é fim de rota. O motoboy troca
     * de aplicativo o tempo todo, e desligar o rastreio a cada troca é
     * exatamente o defeito que o app veio corrigir.
     */
  }, [route.status, token]);

  // ── GPS ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (route.status !== 'IN_PROGRESS' || !navigator.geolocation) return;

    /*
     * Dentro do app o serviço nativo já manda posição, e melhor. Ligar o
     * `watchPosition` junto acenderia o GPS duas vezes para o mesmo dado — o
     * dobro de bateria pelo mesmo mapa.
     */
    if ((window as unknown as { LevoApp?: PonteDoApp }).LevoApp) return;

    let last = 0;

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        // `watchPosition` dispara a cada metro andado; o servidor não precisa
        // disso. Uma posição a cada 15s é suficiente para o mapa do cliente e
        // economiza bateria — que no fim do turno é o que decide se o motoboy
        // deixa o app aberto.
        const now = Date.now();
        if (now - last < PING_INTERVAL_MS) return;
        last = now;

        void fetch('/api/driver/ping', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
          keepalive: true,
        }).catch(() => {
          // Posição perdida não é problema: a próxima chega em 15s. Não vale
          // uma fila offline, ao contrário da confirmação de entrega.
        });
      },
      undefined,
      /*
       * Precisão alta desligada.
       *
       * Ela mantém o chip de GPS aceso sem parar enquanto a tela está aberta, e
       * o `watchPosition` dispara a cada metro andado — o filtro de 15s acima
       * joga fora quase tudo, mas a energia já foi gasta para produzir.
       *
       * Quem carrega o rastreio agora é a localização ao vivo do Telegram, que
       * usa o serviço do sistema: adaptativo, coordenado entre os aplicativos, e
       * funcionando com a tela apagada — que é onde o celular passa o turno.
       * Aqui basta uma posição aproximada, para quando a tela estiver aberta.
       */
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [route.status, token]);

  // ── Ações ──────────────────────────────────────────────────────────────
  /**
   * Recalcula o que falta a partir de onde ele está agora.
   *
   * A posição vem do aparelho na hora, e não do último ping: o ping pode ter
   * minutos, e a rota inteira sairia montada a partir de onde ele já não está.
   */
  function replanejarDaqui() {
    if (!navigator.geolocation) {
      setBlocked('Este aparelho não informa a localização.');
      return;
    }

    setReplanejando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch('/api/driver/replan', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              token,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          if (!r.ok) {
            const corpo = (await r.json().catch(() => ({}))) as { error?: string };
            setBlocked(corpo.error ?? 'Não deu para recalcular agora.');
          } else {
            setFocoManual(null);
            router.refresh();
          }
        } finally {
          setReplanejando(false);
        }
      },
      () => {
        setReplanejando(false);
        setBlocked('Preciso da sua localização para recalcular.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  /**
   * Onde ele está agora, sem travar o fluxo.
   *
   * Recusa explícita é registrada: o dono precisa poder distinguir "recusou o
   * rastreio" de "está com o aplicativo fechado". Uma é escolha dele, a outra é
   * circunstância — e são conversas diferentes.
   */
  function posicaoAgora(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (erro) => {
          if (erro.code === erro.PERMISSION_DENIED) {
            void fetch('/api/driver/tracking-denied', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token }),
              keepalive: true,
            }).catch(() => undefined);
          }
          resolve(null);
        },
        // Seis segundos: ele está no portão, não vale travar o botão por GPS.
        { enableHighAccuracy: false, timeout: 6_000, maximumAge: 30_000 },
      );
    });
  }

  /**
   * Voltar a permitir a localização depois de ter recusado.
   *
   * O navegador não pergunta de novo: uma vez negada, a permissão fica gravada
   * no site e só o próprio usuário reverte, nas configurações. Um botão que
   * "tenta de novo" e falha calado seria pior que botão nenhum — então ele
   * tenta, e quando o navegador recusa na hora, a tela explica o caminho.
   */
  function pedirLocalizacaoDeNovo() {
    setAvisoLocal(null);

    if (!navigator.geolocation) {
      setAvisoLocal('Este aparelho não informa a localização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setAvisoLocal('Pronto, localização liberada.');
        setRecusou(false);
      },
      (erro) => {
        if (erro.code === erro.PERMISSION_DENIED) {
          /*
           * O navegador guardou o "não". A instrução precisa ser específica:
           * "libere nas configurações" não diz onde, e quem está de capacete
           * não vai procurar.
           */
          setAvisoLocal(
            'O navegador guardou a recusa. Toque no cadeado ao lado do endereço, '
              + 'em Permissões, e libere a Localização. Depois volte e toque aqui de novo.',
          );
        } else {
          setAvisoLocal('Não consegui a posição agora. Tente num lugar mais aberto.');
        }
      },
      { enableHighAccuracy: false, timeout: 8_000 },
    );
  }

  async function resolveStop(stop: DriverStopView, outcome: 'DELIVERED' | 'FAILED') {
    const reason = outcome === 'FAILED' ? window.prompt('O que aconteceu?') : null;
    if (outcome === 'FAILED' && reason === null) return;

    /*
     * O código só é pedido na entrega concluída.
     *
     * Entrega que falhou não pede código: ninguém atendeu, e exigir a palavra
     * de quem não estava lá para registrar que ele não estava seria travar o
     * motoboy no portão sem saída.
     */
    let deliveryCode: string | null = null;
    if (outcome === 'DELIVERED' && exigeCodigo) {
      deliveryCode = window.prompt('Código de confirmação do cliente (4 dígitos):');
      // Cancelou: não marca nada. Ele volta a falar com o cliente.
      if (deliveryCode === null) return;
    }

    // Confirma na tela ANTES de falar com o servidor. Sem isso, o motoboy
    // espera o levo de carregamento parado no portão do cliente.
    setResolvedLocally((current) => ({ ...current, [stop.id]: outcome }));

    /*
     * A posição do momento da confirmação vai junto.
     *
     * Espera curta de propósito: o motoboy está no portão, e travar a
     * confirmação esperando GPS faria ele desistir do botão. Sem posição a
     * entrega vale do mesmo jeito — a entrega é o fato, a posição é o registro.
     */
    const posicao = await posicaoAgora().catch(() => null);

    const item = {
      token,
      stopId: stop.id,
      outcome,
      reason,
      deliveryCode,
      lat: posicao?.lat ?? null,
      lng: posicao?.lng ?? null,
      occurredAt: new Date().toISOString(),
    };

    await enqueue(item);
    await sync();
  }

  const emAndamento = route.status === 'IN_PROGRESS' && pending.length > 0;

  return (
    <Shell>
      {emAndamento ? (
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{route.establishmentName}</p>
            <p className="text-xs text-ink-muted">
              <span className="numeric">{done}</span> de{' '}
              <span className="numeric">{stops.length}</span> entregues
            </p>
          </div>

          {/*
            Estado da conexão sempre visível. O motoboy precisa saber que o que
            ele marcou está guardado, mesmo sem sinal — senão ele remarca, ou
            desiste do app.
          */}
          {!online || pendingSync > 0 ? (
            <span
              className="flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-xs text-warning"
              title={blocked ?? undefined}
            >
              <CloudOff className="size-3.5" aria-hidden />
              {pendingSync > 0 ? `${pendingSync} p/ enviar` : 'Sem conexão'}
            </span>
          ) : null}
        </header>
      ) : null}

      <div className="sticky top-0 z-10 bg-canvas">
        <AbasDaRota aba={aba} onAba={irPara} />
      </div>

      {/*
        A rota fica nesta página, acima do dia. "Hoje" só desce a tela —
        a parada em andamento continua aqui, pronta para o Entreguei.
      */}
      <div id="rota" aria-labelledby="aba-rota" className="flex scroll-mt-20 flex-col">
        {route.status === 'PLANNED' ? (
          <AguardandoLiberacao stops={stops.length} loja={route.establishmentName} />
        ) : emAndamento ? null : (
          <RotaConcluida done={done} total={stops.length} nome={route.courierName} />
        )}

      {/*
        A recusa vira um convite, não um beco.

        Ele pode ter negado sem querer, ou mudado de ideia. Sem um caminho de
        volta na tela, a única saída seria alguém explicar por telefone como
        mexer nas permissões do navegador.
      */}
      {recusou || avisoLocal ? (
        <div className="border-b bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
          <p className="leading-relaxed">
            {avisoLocal ?? 'A loja não está recebendo sua localização.'}
          </p>
          <button
            type="button"
            onClick={pedirLocalizacaoDeNovo}
            className="mt-1.5 font-medium underline underline-offset-2"
          >
            Ativar localização
          </button>
        </div>
      ) : null}

      {/* O motivo do bloqueio fica visível, não só no title do ícone. */}
      {blocked && pendingSync > 0 ? (
        <p className="border-b bg-warning-soft px-4 py-2 text-xs text-warning">
          <span className="numeric">{pendingSync}</span>{' '}
          {pendingSync === 1 ? 'entrega guardada' : 'entregas guardadas'} no celular — {blocked}.
          Tentando de novo automaticamente.
        </p>
      ) : null}

      {emAndamento && current ? (
        <CurrentStop stop={current} onResolve={resolveStop} mapa={mapa} />
      ) : null}

      {emAndamento && pending.length > 1 ? (
        <section className="border-t px-4 py-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              Depois desta
            </h2>

            {/*
              Consulta, não navegação: serve para entender o trajeto de uma vez
              — no farol, antes de sair. A navegação de verdade continua sendo o
              "Navegar" da parada em foco, que é o que mantém o motoboy voltando
              ao app para confirmar cada entrega.
            */}
            {mapsRoute ? (
              <a
                href={mapsRoute.url}
                target="_blank"
                rel="noreferrer"
                // O padding negativo compensa o visual: a área de toque fica
                // confortável para polegar sem o link virar um botão.
                className="-my-2 flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-accent"
              >
                <RouteIcon className="size-3.5" aria-hidden />
                Ver no Maps
              </a>
            ) : null}
          </div>
          <ol className="space-y-1">
            {pending
              .filter((stop) => stop.id !== current?.id)
              .map((stop) => (
                <li key={stop.id}>
                  {/*
                    Cada uma é um botão: tocar traz para a frente. Área de toque
                    generosa porque quem usa está de luva, parado no farol.
                  */}
                  <button
                    type="button"
                    onClick={() => setFocoManual(stop.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm transition active:bg-raised"
                  >
                    <span className="numeric mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs bg-raised text-xs text-ink-muted">
                      {stop.position}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">
                        {stop.customerName}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">{stop.address}</span>
                    </span>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden />
                  </button>
                </li>
              ))}
          </ol>

          <p className="mt-2 text-xs text-ink-faint">
            Toque em qualquer uma para entregar fora de ordem.
          </p>

          {/*
            Refazer a partir daqui.
            
            A rota saiu da loja, e é o certo. Mas se ele desviou — passou em
            casa, pegou bloqueio, entregou fora de ordem — a sequência montada
            na porta do restaurante passa a custar quilômetro.
          */}
          {pending.length > 1 ? (
            <button
              type="button"
              onClick={replanejarDaqui}
              disabled={replanejando}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-raised px-3 py-2.5 text-sm font-medium text-ink transition active:opacity-70 disabled:opacity-50"
            >
              {replanejando ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Navigation className="size-4" aria-hidden />
              )}
              {replanejando ? 'Recalculando…' : 'Refazer rota a partir daqui'}
            </button>
          ) : null}

          {/*
            O limite é do Google, não da rota: o planejamento aceita 15 paradas
            e o link comporta 10. Dizer isso na tela evita o motoboy achar que
            entregou tudo porque o Maps acabou.
          */}
          {mapsRoute && mapsRoute.omitted > 0 ? (
            <p className="mt-3 text-xs text-ink-faint">
              O Maps cabe <span className="numeric">{mapsRoute.included}</span> paradas por link
              — as <span className="numeric">{mapsRoute.omitted}</span> últimas continuam só
              aqui.
            </p>
          ) : null}
        </section>
      ) : null}

        {emAndamento ? null : <EscolhaDoMapa />}
      </div>

      <div id="hoje" aria-labelledby="aba-hoje" className="scroll-mt-20 border-t">
        <HistoricoDoDia historico={historico} mostrarTitulo />
      </div>
    </Shell>
  );
}

function AbasDaRota({
  aba,
  onAba,
}: {
  aba: 'rota' | 'hoje';
  onAba: (aba: 'rota' | 'hoje') => void;
}) {
  const abas = [
    ['rota', 'Rota'],
    ['hoje', 'Hoje'],
  ] as const;

  return (
    <div
      className="grid grid-cols-2 gap-1 border-b px-4 py-2"
      role="tablist"
      aria-label="Rota e entregas de hoje"
    >
      {abas.map(([chave, rotulo]) => {
        const ativa = aba === chave;
        return (
          <button
            key={chave}
            type="button"
            role="tab"
            id={`aba-${chave}`}
            aria-selected={ativa}
            aria-controls={chave}
            onClick={() => onAba(chave)}
            className={cn(
              'min-h-12 rounded-lg text-base font-semibold transition',
              ativa ? 'bg-accent text-accent-ink' : 'bg-raised text-ink',
            )}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A rota existe mas o dono ainda não clicou em "saiu para entrega".
 *
 * Antes desta tela, o botão "Entreguei" aparecia normalmente, o servidor
 * respondia 409 e a fila descartava a marcação: o motoboy via a entrega como
 * concluída e nada tinha sido gravado. Agora o estado é explícito.
 */
function AguardandoLiberacao({ stops, loja }: { stops: number; loja: string }) {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-raised text-ink-muted">
          <Package className="size-7" aria-hidden />
        </span>
        <p className="text-xl font-semibold text-ink">Rota pronta, aguardando liberação</p>
        <p className="mx-auto max-w-xs text-sm text-ink-muted">
          São <span className="numeric">{stops}</span> entregas. O {loja} precisa confirmar a saída
          para você começar.
        </p>
        <p className="text-xs text-ink-faint">Esta tela se atualiza sozinha.</p>
      </div>
    </div>
  );
}

function RotaConcluida({ done, total, nome }: { done: number; total: number; nome: string }) {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div className="space-y-3">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-ink">
          <Check className="size-7" aria-hidden />
        </span>
        <p className="text-xl font-semibold text-ink">Rota concluída</p>
        <p className="text-sm text-ink-muted">
          <span className="numeric">{done}</span> de <span className="numeric">{total}</span>{' '}
          entregas finalizadas. Bom trabalho, {nome.split(' ')[0]}.
        </p>
      </div>
    </div>
  );
}

function subscribeToConnection(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** O tema escuro é do container, não do documento: só esta tela é escura. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="flex min-h-dvh flex-col bg-canvas text-ink">
      {children}
    </div>
  );
}

function CurrentStop({
  stop,
  onResolve,
  mapa,
}: {
  stop: DriverStopView;
  onResolve: (stop: DriverStopView, outcome: 'DELIVERED' | 'FAILED') => void;
  mapa: AppDeMapa;
}) {
  const [busy, setBusy] = useState(false);

  async function act(outcome: 'DELIVERED' | 'FAILED') {
    setBusy(true);
    await onResolve(stop, outcome);
    setBusy(false);
  }

  return (
    <section className="flex flex-1 flex-col gap-5 px-4 py-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <MapPin className="size-3.5" aria-hidden />
          Parada {stop.position}
        </p>

        {/*
          O teste do relance: isto precisa ser legível a um braço de distância,
          sob sol, sem tirar a luva. É o tamanho que define a tipografia aqui,
          não o gosto de quem desenhou.
        */}
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">
          {stop.customerName}
        </h1>

        <p className="mt-2 text-lg leading-snug text-ink-muted">{stop.address}</p>

        {stop.reference ? (
          <p className="mt-1 text-base text-ink-faint">{stop.reference}</p>
        ) : null}

        {stop.notes ? (
          <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-base text-ink">
            {stop.notes}
          </p>
        ) : null}

        <p className="numeric mt-3 text-lg font-medium text-ink">{currency(stop.amountCents)}</p>
      </div>

      <EscolhaDoMapa embutido />

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="touch"
          variant="outline"
          asChild
          className={cn(!stop.coordinates && 'pointer-events-none opacity-40')}
        >
          {/*
            Abre o app que ele escolheu neste aparelho. Reimplementar navegação
            passo a passo dentro do produto seria competir com o Waze e perder.
          */}
          <a href={urlDeNavegacao(stop, mapa)} target="_blank" rel="noreferrer">
            <Navigation />
            Navegar
          </a>
        </Button>

        <Button
          size="touch"
          variant="outline"
          asChild
          className={cn(!stop.customerPhone && 'pointer-events-none opacity-40')}
        >
          <a href={stop.customerPhone ? `tel:+55${stop.customerPhone}` : '#'}>
            <Phone />
            {stop.customerPhone ? phoneDisplay(stop.customerPhone) : 'Sem telefone'}
          </a>
        </Button>
      </div>

      <div className="mt-auto space-y-2">
        <Button
          size="touch"
          variant="primary"
          className="w-full text-lg font-semibold"
          disabled={busy}
          onClick={() => act('DELIVERED')}
        >
          <Check />
          Entreguei
        </Button>

        <Button
          size="touch"
          variant="ghost"
          className="w-full"
          disabled={busy}
          onClick={() => act('FAILED')}
        >
          <TriangleAlert />
          Não consegui entregar
        </Button>
      </div>
    </section>
  );
}

export function CourierEmpty() {
  return (
    <Shell>
      <div className="grid flex-1 place-items-center px-6 text-center">
        <div className="space-y-2">
          <Package className="mx-auto size-8 text-ink-faint" aria-hidden />
          <p className="text-lg font-medium text-ink">Nenhuma rota neste link</p>
          <p className="text-sm text-ink-muted">Peça um link novo ao estabelecimento.</p>
        </div>
      </div>
    </Shell>
  );
}
