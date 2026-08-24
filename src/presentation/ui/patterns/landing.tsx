import Link from 'next/link';
import { Bike, Clock, MapPin, MessageCircle, Route, Store } from 'lucide-react';
import { Button } from '../primitives';
import { Logo } from '../logo';

/**
 * A página pública do Levô.
 *
 * Escrita para duas leituras diferentes: o dono de restaurante, que precisa se
 * reconhecer no problema em cinco segundos, e o avaliador de integração, que
 * precisa entender o que o produto faz com os pedidos que recebe. Por isso as
 * afirmações são todas verificáveis no produto — nada de números de adoção ou
 * depoimento inventado, que é justamente o que um avaliador checa.
 *
 * Sem imagem externa de propósito: as prévias de tela são construídas com os
 * mesmos tokens do app, então nunca ficam desatualizadas em relação a ele nem
 * pesam no carregamento.
 */
export function Landing() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5">
          <Logo />

          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <a href="#como-funciona">Como funciona</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-16 pt-16 sm:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-sm bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
            <Bike className="size-3.5" aria-hidden />
            Para quem entrega com motoboy próprio
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            O pedido chega pelo aplicativo. A entrega é sua.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
            O Levô junta os pedidos do turno, calcula a melhor ordem das entregas, põe a rota no
            celular do motoboy e manda ao cliente um link para acompanhar a moto em tempo real.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button asChild variant="primary" size="lg">
              <Link href="/login">Entrar no painel</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </div>
        </section>

        <Problem />
        <HowItWorks />
        <Screens />
        <Sources />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-sm text-ink-faint sm:flex-row sm:items-center">
          <Logo />

          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Política de privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Problem() {
  return (
    <section className="border-y bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Oito pedidos na mesa, e a ordem das entregas decidida de cabeça.
        </h2>

        <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
          O restaurante recebe os pedidos por aplicativo, mas quem entrega é a moto da casa. Aí a
          gestão vira papel: o dono anota os endereços, entrega um maço ao motoboy, e ele escolhe
          o caminho no instinto. Enquanto isso, o cliente liga para perguntar onde está.
        </p>

        <dl className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-3">
          {[
            {
              term: 'Ordem no instinto',
              detail:
                'Duas entregas no mesmo bairro saem em viagens separadas porque ninguém olhou o conjunto.',
            },
            {
              term: 'Moto invisível',
              detail:
                'Depois que sai, o dono só sabe onde o motoboy está se ligar para ele — no trânsito.',
            },
            {
              term: 'Telefone tocando',
              detail:
                '"Já saiu?" é a pergunta que mais interrompe a cozinha no horário de pico.',
            },
          ].map(({ term, detail }) => (
            <div key={term}>
              <dt className="text-sm font-semibold text-ink">{term}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Store,
      title: 'Os pedidos entram',
      detail:
        'Por integração com a plataforma, por webhook do seu sistema ou cadastrados na mão. O endereço vira coordenada automaticamente.',
    },
    {
      icon: Route,
      title: 'A rota é calculada',
      detail:
        'Você marca as entregas do turno e escolhe o motoboy. O roteirizador resolve a melhor ordem usando a malha viária real, não distância em linha reta.',
    },
    {
      icon: Bike,
      title: 'O motoboy recebe no celular',
      detail:
        'Um link sem senha abre a rota já ordenada: uma parada por vez, botão de navegar e confirmação de entrega que funciona mesmo sem sinal.',
    },
    {
      icon: MessageCircle,
      title: 'O cliente acompanha',
      detail:
        'Sai uma mensagem pronta de WhatsApp com um link de rastreio. Ele vê a moto se mexendo no mapa e para de ligar para o restaurante.',
    },
  ];

  return (
    <section id="como-funciona" className="scroll-mt-14">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Como funciona
        </h2>

        <ol className="mt-10 grid gap-8 sm:grid-cols-2">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-ink">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <h3 className="flex items-baseline gap-2 font-semibold text-ink">
                  <span className="numeric text-xs text-ink-faint">{index + 1}</span>
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Três telas, três contextos.
 *
 * As prévias são deliberadamente pequenas e sem interação: o objetivo é dar
 * escala e forma ao que o texto descreve, não simular o produto.
 */
function Screens() {
  return (
    <section className="border-y bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Uma tela para cada um
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          O dono, o motoboy e o cliente têm necessidades diferentes — e nenhum deles deveria
          aprender a usar a tela do outro.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <ScreenCard
            role="O dono"
            summary="Marca os pedidos, escolhe o motoboy, acompanha a moto no mapa."
          >
            <div className="space-y-1.5">
              {['Maria Aparecida', 'Carlos Eduardo', 'Juliana Ferraz'].map((name, i) => (
                <div key={name} className="flex items-center gap-2 rounded-xs bg-canvas px-2 py-1.5">
                  <span
                    className={`size-3 shrink-0 rounded-[3px] ${i < 2 ? 'bg-accent' : 'hairline'}`}
                    aria-hidden
                  />
                  <span className="truncate text-[11px] text-ink-muted">{name}</span>
                </div>
              ))}
            </div>
          </ScreenCard>

          <ScreenCard
            role="O motoboy"
            summary="Uma parada por vez, letra grande, funciona sem sinal."
          >
            <div data-theme="dark" className="rounded-xs bg-canvas p-2.5">
              <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-accent">
                <MapPin className="size-2.5" aria-hidden />
                Parada 2
              </p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">Juliana Ferraz</p>
              <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
                Rua Padre Anchieta, 1500
              </p>
              <div className="mt-2 rounded-[3px] bg-accent py-1 text-center text-[10px] font-semibold text-accent-ink">
                Entreguei
              </div>
            </div>
          </ScreenCard>

          <ScreenCard
            role="O cliente"
            summary="Abre o link do WhatsApp e vê a moto se aproximando."
          >
            <div className="rounded-xs bg-canvas px-2.5 py-3">
              <p className="text-[11px] font-semibold text-ink">A caminho, Maria</p>
              <div className="mt-2.5 flex items-center gap-1">
                <span className="h-1 flex-1 rounded-full bg-accent" aria-hidden />
                <span className="h-1 flex-1 rounded-full bg-accent" aria-hidden />
                <span className="h-1 flex-1 rounded-full bg-line" aria-hidden />
              </div>
              <p className="numeric mt-2.5 flex items-center gap-1 text-[10px] text-ink-muted">
                <Clock className="size-2.5" aria-hidden />
                12 min
              </p>
            </div>
          </ScreenCard>
        </div>
      </div>
    </section>
  );
}

function ScreenCard({
  role,
  summary,
  children,
}: {
  role: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-raised p-4 hairline">
      <h3 className="text-sm font-semibold text-ink">{role}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{summary}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Sources() {
  return (
    <section>
      <div className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          De onde vêm os pedidos
        </h2>

        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          O Levô não substitui o canal de vendas: ele começa a trabalhar depois que o pedido já
          foi aceito, na hora de decidir quem leva e por onde.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <SourceCard title="Plataformas de pedido">
            Integração para importar os pedidos aceitos e devolver o status da entrega. iFood e
            aiqfome estão implementados e permanecem desligados até a homologação de cada
            plataforma sair.
          </SourceCard>

          <SourceCard title="Webhook próprio">
            Quem já tem sistema de balcão manda o pedido por HTTP, com assinatura HMAC. O mesmo
            pedido reenviado não vira entrega duplicada.
          </SourceCard>

          <SourceCard title="Cadastro manual">
            Pedido de telefone ou de balcão entra pelo painel em poucos campos — porque o piloto
            não pode depender de integração pronta.
          </SourceCard>
        </div>
      </div>
    </section>
  );
}

function SourceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface p-5 hairline">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}
