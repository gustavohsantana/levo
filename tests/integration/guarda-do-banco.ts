import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * A trava que impede esta suíte de apagar um banco com dado de verdade.
 *
 * Ela existe porque o pior já aconteceu: a suíte foi rodada com a `DATABASE_URL`
 * de produção carregada do `.env`, e o `beforeEach` de `persistence.test.ts`
 * apagou 856 pedidos, 129 rotas e os pagamentos. Nada no caminho avisou — nem o
 * teste, nem o Prisma, nem o banco. O prejuízo levou dez segundos; a recuperação,
 * uma hora.
 *
 * A conferência decisiva não é o nome do banco, é o CONTEÚDO dele.
 *
 * Convenção de nome depende de todo mundo lembrar da convenção, e o dia em que
 * alguém aponta para produção é justamente o dia em que ninguém lembrou. Já
 * "este banco tem pedidos de verdade" é observável, não depende de disciplina, e
 * é exatamente a pergunta cuja resposta errada custa caro.
 */
const TETO_DE_PEDIDOS = 20;

/**
 * A decisão, separada do encanamento.
 *
 * Pura de propósito: a trava que só é exercitada quando alguém aponta para
 * produção é uma trava que ninguém sabe se funciona. Assim ela tem teste, e o
 * teste não precisa de um banco cheio para rodar.
 */
export function podeApagar(input: {
  pedidos: number;
  confirmacao: string | undefined;
}): { permitido: boolean; motivo?: string } {
  if (input.confirmacao === 'confirmo') return { permitido: true };
  if (input.pedidos > TETO_DE_PEDIDOS) {
    return { permitido: false, motivo: `${input.pedidos} pedidos` };
  }
  return { permitido: true };
}

export async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Testes de integração precisam de DATABASE_URL apontando para um banco descartável.',
    );
  }

  /*
   * A porta de fuga é explícita e tem que ser digitada na hora.
   *
   * Fica fora do `.env` de propósito: variável em arquivo é ligada uma vez e
   * esquecida para sempre, e aí a trava vira enfeite.
   */
  if (process.env.LEVO_BANCO_DESCARTAVEL === 'confirmo') return;

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const pedidos = await prisma.order.count();
    const veredito = podeApagar({
      pedidos,
      confirmacao: process.env.LEVO_BANCO_DESCARTAVEL,
    });

    if (!veredito.permitido) {
      const host = url.match(/@([^/?]+)/)?.[1] ?? 'desconhecido';
      throw new Error(
        [
          '',
          '  ┌─ RECUSADO ────────────────────────────────────────────────┐',
          `  Este banco tem ${pedidos} pedidos. Não parece descartável.`,
          '',
          `  host: ${host}`,
          '',
          '  Esta suíte APAGA tabelas antes de cada caso. Rodar aqui',
          '  destrói dado real, e foi assim que 856 pedidos se perderam.',
          '',
          '  Aponte a DATABASE_URL para um banco de teste — no Neon, um',
          '  branch novo resolve em segundos:',
          '',
          '    neonctl branches create --name teste --project-id <id>',
          '',
          '  Se você REALMENTE quer rodar contra este banco, digite na hora:',
          '',
          '    LEVO_BANCO_DESCARTAVEL=confirmo npm run test:integration',
          '  └───────────────────────────────────────────────────────────┘',
          '',
        ].join('\n'),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
