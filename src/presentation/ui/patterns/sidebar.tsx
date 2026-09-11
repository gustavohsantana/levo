'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bike,
  BookOpen,
  ChefHat,
  ClipboardList,
  Plug,
  Settings as SettingsIcon,
  Store,
} from 'lucide-react';
import { SinoDaBarra } from './sidebar-bell';

/**
 * A navegação do painel, fixa à esquerda.
 *
 * Estava no topo, e menu no topo faz cada tela parecer um lugar diferente —
 * o dono sentia que estava "abrindo páginas". Fixo na lateral, o que muda é
 * só o conteúdo, e ele sempre vê onde está e para onde pode ir.
 *
 * Agrupado por assunto porque as duas metades têm ritmos diferentes: a
 * operação é usada o tempo todo, durante o expediente; a loja é configurada
 * uma vez e revisitada de vez em quando.
 */
const GRUPOS = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/dashboard', rotulo: 'Pedidos', icone: ClipboardList },
      { href: '/dashboard/entregadores', rotulo: 'Entregadores', icone: Bike },
      { href: '/dashboard/relatorios', rotulo: 'Relatórios', icone: BarChart3 },
      /*
       * Abre em aba nova: é a tela do tablet da cozinha, e quem clica daqui
       * está só conferindo — não quer perder o painel de vista.
       */
      { href: '/cozinha', rotulo: 'Cozinha', icone: ChefHat, novaAba: true },
    ],
  },
  {
    titulo: 'Minha loja',
    itens: [
      { href: '/dashboard/catalogo', rotulo: 'Catálogo', icone: BookOpen },
      { href: '/dashboard/integracoes', rotulo: 'Integrações', icone: Plug },
      { href: '/dashboard/ifood', rotulo: 'iFood', icone: Store },
      { href: '/dashboard/configuracoes', rotulo: 'Configurações', icone: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  const caminho = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-4 lg:overflow-visible lg:p-4">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="flex gap-1 lg:flex-col lg:gap-0.5">
          <p className="hidden px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-white/50 lg:block">
            {grupo.titulo}
          </p>

          {grupo.itens.map((item) => {
            /*
             * `/dashboard` casaria com tudo se comparado por prefixo, então
             * ele exige igualdade exata — sem isso, "Pedidos" ficaria aceso
             * em todas as telas.
             */
            const ativo =
              item.href === '/dashboard'
                ? caminho === '/dashboard'
                : caminho.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                /*
                 * A cozinha abre em aba separada.
                 *
                 * Ela vive num tablet na parede, ou numa aba de lado, aberta o
                 * turno inteiro. Trocar o painel por ela faria o dono perder a
                 * fila de despacho toda vez que fosse só conferir o preparo.
                 */
                target={emAbaNova(item) ? '_blank' : undefined}
                rel={emAbaNova(item) ? 'noreferrer' : undefined}
                aria-current={ativo ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm transition ${
                  ativo
                    ? 'bg-white/15 font-medium text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icone className="size-4 shrink-0" aria-hidden />
                {item.rotulo}
              </Link>
            );
          })}

          {/*
            O sino fecha a Operação porque é isso que ele é: trabalho chegando.
            Fora do painel de Pedidos ele é a única coisa que avisa que existe
            fila — em Catálogo ou Relatórios não há mais nada olhando por isso.
          */}
          {grupo.titulo === 'Operação' ? <SinoDaBarra /> : null}
        </div>
      ))}
    </nav>
  );
}

/** Itens que não substituem o painel: eles convivem com ele. */
function emAbaNova(item: { href: string }): boolean {
  return 'novaAba' in item && item.novaAba === true;
}
