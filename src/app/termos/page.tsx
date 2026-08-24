import type { Metadata } from 'next';
import { LegalPage } from '@/presentation/ui/patterns/legal-page';

export const metadata: Metadata = {
  title: 'Termos de uso · Levô',
  description: 'Condições de uso do Levô: o que o serviço faz, o que se espera de quem usa.',
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de uso" updatedAt="23 de agosto de 2026">
      <p>
        Estes termos regem o uso do <strong>Levô</strong>, serviço de organização de rotas de
        entrega para estabelecimentos que entregam com equipe própria. Ao usar o serviço, o
        estabelecimento concorda com o que está aqui.
      </p>

      <h2>O que o serviço faz</h2>
      <p>
        O Levô recebe os pedidos do estabelecimento, calcula uma ordem de entrega, disponibiliza a
        rota ao entregador por um link e oferece ao cliente final uma página para acompanhar a
        entrega. O serviço organiza a operação de entrega — <strong>não</strong> realiza a entrega,
        não intermedia a venda e não emprega entregadores.
      </p>

      <h2>Conta e credenciais</h2>
      <ul>
        <li>
          o estabelecimento é responsável por manter suas credenciais em sigilo e responde pelo que
          for feito com elas;
        </li>
        <li>
          os links do entregador e de acompanhamento do cliente dispensam senha por decisão de
          desenho — quem tiver o link tem acesso ao conteúdo dele, e cabe ao estabelecimento
          distribuí-los apenas a quem deve recebê-los.
        </li>
      </ul>

      <h2>Uso aceitável</h2>
      <ul>
        <li>
          cadastrar apenas dados de pedidos reais, com autorização para tratá-los conforme a{' '}
          <a href="/privacidade">política de privacidade</a>;
        </li>
        <li>não tentar acessar dados de outro estabelecimento;</li>
        <li>
          não sobrecarregar o serviço com automações que ultrapassem o uso normal da operação.
        </li>
      </ul>

      <h2>Integrações com plataformas de pedido</h2>
      <p>
        A conexão com plataformas como iFood e aiqfome depende de autorização dada pelo próprio
        estabelecimento e permanece sujeita às regras de cada plataforma. Ela pode ser revogada a
        qualquer momento, pelo estabelecimento ou pela plataforma, e o Levô não controla a
        disponibilidade dessas APIs.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        O serviço depende de terceiros — hospedagem, banco de dados, roteirização, geocodificação e
        as plataformas de pedido. Manutenções e indisponibilidades podem ocorrer. Não há garantia
        de disponibilidade ininterrupta, e o cálculo de rota é uma <strong>sugestão</strong> baseada
        em dados de mapa: a decisão do trajeto, no trânsito real, é sempre de quem conduz.
      </p>

      <h2>Responsabilidade</h2>
      <p>
        O Levô não responde por atrasos, prejuízos ou danos decorrentes da execução da entrega, de
        endereços informados incorretamente, de indisponibilidade de serviços de terceiros ou de
        decisões tomadas com base nas rotas sugeridas.
      </p>

      <h2>Encerramento</h2>
      <p>
        O estabelecimento pode encerrar o uso quando quiser. O Levô pode suspender o acesso em caso
        de descumprimento destes termos, comunicando o motivo.
      </p>

      <h2>Alterações</h2>
      <p>
        Estes termos podem ser atualizados. A data de última atualização aparece no topo desta
        página, e mudanças relevantes serão comunicadas ao estabelecimento.
      </p>

      <h2>Contato</h2>
      <p>
        <strong>[razão social]</strong>, CNPJ <strong>[CNPJ]</strong> — <strong>[e-mail de contato]</strong>.
      </p>
    </LegalPage>
  );
}
