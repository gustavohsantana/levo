/**
 * A marca do Levô.
 *
 * O símbolo é o "L" desenhado como trajeto: começa num ponto vazado (a
 * cozinha), desce, dobra a esquina e termina num ponto cheio (o cliente). É a
 * própria operação do produto — sair de um lugar e chegar noutro, nesta ordem —
 * e não um monograma genérico dentro de um quadrado.
 *
 * Desenhado em `currentColor` para herdar a cor de quem o usa: lima sobre
 * escuro na tela do motoboy, tinta sobre claro no painel. Uma marca que só
 * funciona numa cor é uma marca que quebra na primeira aplicação nova.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Levô"
      // O traço não escala junto: em 16px a marca precisa do mesmo peso óptico
      // que em 64px, senão some no cabeçalho.
      vectorEffect="non-scaling-stroke"
    >
      {/*
        Um ponto só, no fim. A primeira versão marcava origem e destino, e os
        dois círculos brigavam: em 16px viravam mancha, e em tamanho grande a
        forma lia como gancho de telefone, não como "L".
      */}
      <path
        d="M7 4v10.5a2.5 2.5 0 0 0 2.5 2.5H18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="17" r="2.75" fill="currentColor" />
    </svg>
  );
}

/**
 * Marca + palavra, para cabeçalho e rodapé.
 *
 * O nome vai em texto de verdade, não em curvas: ele herda a Instrument Sans
 * do resto da interface e continua selecionável e legível para leitor de tela.
 */
export function Logo({
  className,
  /**
   * Sobre a lateral verde do painel.
   *
   * Só a palavra troca de cor: o símbolo continua no lima da marca, que sobre o
   * verde fundo é onde ele mais aparece em toda a interface.
   */
  sobreEscuro = false,
}: {
  className?: string;
  sobreEscuro?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark className="size-5 text-accent" />
      <span
        className={`text-sm font-semibold tracking-tight ${sobreEscuro ? 'text-white' : 'text-ink'}`}
      >
        Levô
      </span>
    </span>
  );
}
