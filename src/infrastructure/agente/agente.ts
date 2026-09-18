import type { Logger } from '@/core';
import {
  descrever,
  deuErrado,
  serializar,
  type Ferramenta,
  type ResultadoDeFerramenta,
} from './ferramenta';
import {
  LIMITES_PADRAO,
  valoresSemProcedencia,
  type Limites,
} from './guardrails';
import {
  somarUso,
  usoZerado,
  type FalaDoDialogo,
  type PortaDeLLM,
  type Uso,
} from './porta-llm';

/**
 * Todo resultado de ferramenta que já apareceu na conversa.
 *
 * O diálogo é a memória: os retornos ficam nele como falas de papel
 * `ferramenta`. Reler dali dispensa guardar a mesma coisa duas vezes.
 */
function resultadosNoDialogo(dialogo: FalaDoDialogo[]): ResultadoDeFerramenta[] {
  return dialogo
    .filter((f): f is Extract<FalaDoDialogo, { papel: 'ferramenta' }> => f.papel === 'ferramenta')
    .map((f) => {
      try {
        return JSON.parse(f.conteudo) as ResultadoDeFerramenta;
      } catch {
        return { ok: false };
      }
    });
}

/**
 * O laço: pergunta ao modelo, executa o que ele pedir, repete até ele responder.
 *
 * Agnóstico de domínio. Não sabe o que é pizza nem o que é consulta médica — só
 * sabe conversar, chamar ferramenta e parar na hora certa. Levô e clínica usam
 * este mesmo arquivo; o que muda é a lista de ferramentas e o prompt.
 */

export interface RespostaDoAgente {
  /** O que dizer ao usuário. Vazio quando o modelo não produziu texto. */
  texto: string;
  /** O diálogo completo, para gravar e continuar na próxima mensagem. */
  dialogo: FalaDoDialogo[];
  uso: Uso;
  /** Quantas voltas o laço deu. Alto de forma recorrente é ferramenta mal descrita. */
  iteracoes: number;
  /**
   * Valores em reais citados sem virem de ferramenta.
   *
   * Vazio é o esperado. Não vazio é o chamador que decide: em confirmação de
   * pedido, barrar; em conversa solta, registrar e seguir.
   */
  valoresSuspeitos: string[];
  /** Por que parou. `teto` significa que o laço foi interrompido, não concluído. */
  fim: 'resposta' | 'teto';
}

export class Agente {
  private readonly limites: Limites;

  constructor(
    private readonly opts: {
      porta: PortaDeLLM;
      /** Instruções fixas. Primeiro no prefixo, para o cache pegar. */
      sistema: string;
      ferramentas: Ferramenta[];
      limites?: Partial<Limites>;
      logger?: Logger;
    },
  ) {
    this.limites = { ...LIMITES_PADRAO, ...opts.limites };
  }

  async responder(dialogoInicial: FalaDoDialogo[]): Promise<RespostaDoAgente> {
    const dialogo = [...dialogoInicial];
    const descricoes = this.opts.ferramentas.map(descrever);

    let uso = usoZerado();
    let iteracoes = 0;

    while (iteracoes < this.limites.iteracoes) {
      iteracoes += 1;

      const resposta = await this.opts.porta.responder({
        sistema: this.opts.sistema,
        dialogo,
        ferramentas: descricoes,
      });

      uso = somarUso(uso, resposta.uso);

      dialogo.push({
        papel: 'assistente',
        texto: resposta.texto,
        ...(resposta.chamadas.length > 0 ? { chamadas: resposta.chamadas } : {}),
      });

      // Sem chamada de ferramenta, o modelo terminou.
      if (resposta.chamadas.length === 0) {
        const texto = resposta.texto ?? '';
        return {
          texto,
          dialogo,
          uso,
          iteracoes,
          /*
           * Confere contra o diálogo INTEIRO, não só esta chamada.
           *
           * Medido em conversa real: o cliente pede pizza num turno, informa o
           * endereço no outro, e o bot anuncia o total. As parcelas vieram de
           * turnos diferentes, e olhar só a rodada atual acusava um total
           * perfeitamente correto.
           */
          valoresSuspeitos: valoresSemProcedencia(texto, resultadosNoDialogo(dialogo)),
          fim: 'resposta',
        };
      }

      /*
       * Em paralelo, e TODOS os resultados voltam.
       *
       * Devolver só os que deram certo faz o modelo perder a referência da
       * chamada que falhou e ficar esperando um resultado que nunca vem — e o
       * cliente leva silêncio.
       */
      const resultados = await Promise.all(
        resposta.chamadas.map((c) => this.executar(c.nome, c.argumentos)),
      );

      resposta.chamadas.forEach((chamada, i) => {
        const resultado = resultados[i];
        dialogo.push({
          papel: 'ferramenta',
          chamadaId: chamada.id,
          nome: chamada.nome,
          conteudo: serializar(resultado),
        });
      });
    }

    /*
     * Estourou o teto.
     *
     * Devolve texto vazio de propósito: quem chama decide o que dizer ao
     * cliente. Inventar uma desculpa aqui esconderia um sintoma que precisa
     * aparecer no log — laço cheio quase sempre é ferramenta mal descrita.
     */
    this.opts.logger?.warn(
      { modelo: this.opts.porta.modelo, iteracoes },
      'agente.teto_de_iteracoes',
    );

    return { texto: '', dialogo, uso, iteracoes, valoresSuspeitos: [], fim: 'teto' };
  }

  /**
   * Executa uma ferramenta sem deixar exceção subir.
   *
   * Falha de ferramenta é informação para o modelo — "esse CEP não existe" faz
   * ele pedir outro. Exceção mataria a conversa inteira por causa de um passo.
   */
  private async executar(
    nome: string,
    argumentos: Record<string, unknown>,
  ): Promise<ResultadoDeFerramenta> {
    const ferramenta = this.opts.ferramentas.find((f) => f.nome === nome);

    if (!ferramenta) {
      // Acontece: o modelo inventa nome de ferramenta. Dizer quais existem
      // costuma fazer ele acertar na próxima volta.
      const existentes = this.opts.ferramentas.map((f) => f.nome).join(', ');
      return deuErrado(`Ferramenta "${nome}" não existe. Disponíveis: ${existentes}`);
    }

    try {
      return await ferramenta.executar(argumentos);
    } catch (cause) {
      this.opts.logger?.error({ nome, cause: String(cause) }, 'agente.ferramenta_estourou');
      return deuErrado('A ferramenta falhou. Tente outra abordagem ou peça ajuda humana.');
    }
  }
}
