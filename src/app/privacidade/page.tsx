import type { Metadata } from 'next';
import { LegalPage } from '@/presentation/ui/patterns/legal-page';

export const metadata: Metadata = {
  title: 'Política de privacidade · Levô',
  description:
    'Quais dados o Levô trata, para quê, com quem compartilha e por quanto tempo guarda.',
};

/**
 * Política de privacidade.
 *
 * Escrita a partir do que o sistema faz de verdade — os prazos e as categorias
 * de dado saem do código, não de modelo genérico. Prometer na política o que o
 * software não cumpre é o pior dos dois mundos: não protege ninguém e ainda
 * cria obrigação que já nasce descumprida.
 */
export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de privacidade" updatedAt="23 de agosto de 2026">
      <p>
        Esta política explica como o <strong>Levô</strong> trata dados pessoais. Ela vale para o
        painel usado pelo estabelecimento, para a tela do entregador e para a página de
        acompanhamento aberta pelo cliente final.
      </p>

      <h2>Quem é responsável pelo quê</h2>
      <p>
        O <strong>estabelecimento</strong> que contrata o Levô é o <strong>controlador</strong> dos
        dados dos pedidos: é ele quem decide coletá-los e para que usá-los. O Levô atua como{' '}
        <strong>operador</strong>, tratando esses dados apenas conforme as instruções do
        estabelecimento e o necessário para prestar o serviço.
      </p>
      <p>
        Em relação à conta de acesso do próprio estabelecimento (nome, e-mail e senha de quem
        entra no painel), o Levô é o controlador.
      </p>

      <h2>Dados tratados</h2>
      <ul>
        <li>
          <strong>Do cliente final:</strong> nome, telefone, endereço de entrega, ponto de
          referência, observações do pedido e valor. Vêm do estabelecimento — digitados no painel,
          enviados pelo sistema dele ou importados da plataforma onde o pedido foi feito.
        </li>
        <li>
          <strong>Do entregador:</strong> nome, telefone e, <em>durante a rota</em>, a localização
          do aparelho, registrada a cada 15 segundos enquanto a entrega está em andamento.
        </li>
        <li>
          <strong>Da conta do estabelecimento:</strong> nome, e-mail e senha, guardada apenas como
          hash — a senha original não fica registrada e não pode ser recuperada.
        </li>
        <li>
          <strong>Coordenadas de endereços:</strong> a conversão de endereço em latitude e
          longitude é guardada em cache para reduzir consultas externas.
        </li>
      </ul>

      <h2>Para que os dados são usados</h2>
      <ul>
        <li>calcular a ordem das entregas e a rota do turno;</li>
        <li>mostrar ao estabelecimento onde o entregador está durante a rota;</li>
        <li>
          permitir que o cliente final acompanhe a entrega por um link, sem precisar criar conta;
        </li>
        <li>gerar a mensagem que o estabelecimento envia ao cliente pelo WhatsApp.</li>
      </ul>
      <p>
        Os dados <strong>não</strong> são usados para publicidade, não são vendidos e não são
        cedidos a terceiros para fins próprios deles.
      </p>

      <h2>Com quem os dados são compartilhados</h2>
      <ul>
        <li>
          <strong>Serviço de roteirização:</strong> recebe apenas coordenadas geográficas, sem nome
          nem telefone.
        </li>
        <li>
          <strong>Serviço de geocodificação:</strong> recebe o endereço para convertê-lo em
          coordenadas.
        </li>
        <li>
          <strong>Plataformas de pedido</strong> (como iFood e aiqfome), quando o estabelecimento
          autoriza a integração: os pedidos vêm de lá e o estado da entrega pode voltar para lá.
        </li>
        <li>
          <strong>Provedores de hospedagem e banco de dados</strong>, que armazenam as informações
          para que o serviço funcione.
        </li>
      </ul>

      <h2>Link de acompanhamento</h2>
      <p>
        A página de acompanhamento é aberta por um endereço com um código único, sem senha — foi
        desenhada assim para que o cliente não precise instalar nada nem se cadastrar. Quem tiver o
        link consegue ver o andamento daquela entrega, e por isso ele mostra apenas o necessário
        para acompanhar. Trate-o como informação do pedido: quem recebe o link vê o pedido.
      </p>

      <h2>Por quanto tempo os dados ficam guardados</h2>
      <ul>
        <li>
          <strong>Localização do entregador:</strong> apagada automaticamente{' '}
          <strong>7 dias</strong> depois de a rota ser concluída. É o único dado com descarte
          programado, porque é o mais sensível e o de menor utilidade depois da entrega.
        </li>
        <li>
          <strong>Pedidos e rotas:</strong> mantidos enquanto o estabelecimento usar o serviço, que
          precisa deles para o próprio histórico de operação.
        </li>
        <li>
          <strong>Conta de acesso:</strong> mantida enquanto a conta existir.
        </li>
      </ul>

      <h2>Direitos do titular</h2>
      <p>
        A LGPD garante ao titular confirmar a existência de tratamento, acessar os dados, corrigir
        os incompletos ou desatualizados, pedir anonimização, bloqueio ou eliminação, e revogar
        consentimento. Como os dados dos pedidos pertencem ao estabelecimento que atendeu você, o
        caminho mais rápido é falar diretamente com ele. Pedidos enviados ao Levô são encaminhados
        ao estabelecimento responsável.
      </p>

      <h2>Segurança</h2>
      <ul>
        <li>todo o tráfego é cifrado em trânsito (HTTPS);</li>
        <li>senhas são guardadas apenas como hash;</li>
        <li>
          credenciais de integração com plataformas de pedido são gravadas cifradas no banco de
          dados;
        </li>
        <li>
          cada estabelecimento só enxerga os próprios dados, com separação verificada no acesso ao
          banco.
        </li>
      </ul>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre esta política ou sobre tratamento de dados: <strong>[e-mail de contato]</strong>.
      </p>
      <p>
        Controlador da conta de acesso: <strong>[razão social]</strong>, CNPJ{' '}
        <strong>[CNPJ]</strong>.
      </p>
    </LegalPage>
  );
}
