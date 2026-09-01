/**
 * Cadastra exemplos que exercitam o modelo de grupos de opcao.
 *
 * Sao os tres desenhos que o mercado usa, com precos reais de Pouso Alegre:
 *
 *   Pizza Prime   tamanho e produto, sabor e opcao com preco proprio
 *   Skina         sabor e produto, tamanho e grupo compartilhado
 *   Acai da Toca  tamanho e produto, adicionais somam
 *   Marmitex      sem grupo nenhum
 *
 * Idempotente: apaga os exemplos anteriores antes de recriar, entao rodar duas
 * vezes nao duplica. So mexe no que ele mesmo criou.
 *
 * Uso:  npx tsx infra/exemplos-com-opcoes.mts
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { env } from '../src/env';
import { getPrismaClient } from '../src/infrastructure/persistence/prisma/client';

const c = env();
const prisma = getPrismaClient(c.DATABASE_URL);
const est = await prisma.establishment.findFirst({ select: { id: true, name: true } });
if (!est) throw new Error('nenhum estabelecimento');

const CATEGORIAS = ['Pizzas Salgadas', 'Pizzas por Sabor', 'Açaí', 'Marmitas'];

console.log(`${est.name}\n`);

// Limpa so o que este script cria, para poder rodar de novo.
const antigos = await prisma.product.findMany({
  where: { establishmentId: est.id, category: { in: CATEGORIAS } },
  select: { id: true },
});
if (antigos.length > 0) {
  await prisma.product.deleteMany({ where: { id: { in: antigos.map((p) => p.id) } } });
}
await prisma.optionGroup.deleteMany({
  where: {
    establishmentId: est.id,
    name: { in: ['Massas', 'Sabores 35cm', 'Sabores 25cm', 'Tamanho da pizza', 'Borda 35cm', 'Borda 25cm', 'Base do açaí', 'Frutas', 'Cremes e lácteos', 'Cereais', 'Prato da marmita'] },
  },
});

async function grupo(name: string, min: number, max: number, opcoes: Array<[string, number]>) {
  const id = randomUUID();
  await prisma.optionGroup.create({ data: { id, establishmentId: est!.id, name, min, max } });
  await prisma.option.createMany({
    data: opcoes.map(([nome, reais], i) => ({
      id: randomUUID(),
      groupId: id,
      name: nome,
      priceCents: Math.round(reais * 100),
      position: i,
    })),
  });
  console.log(`  grupo "${name}" — ${min > 0 ? `obrigatório ${min}` : 'opcional'}, até ${max}, ${opcoes.length} opções`);
  return id;
}

async function produto(name: string, reais: number, category: string, grupos: string[], description?: string) {
  const id = randomUUID();
  await prisma.product.create({
    data: { id, establishmentId: est!.id, name, description: description ?? null, priceCents: Math.round(reais * 100), category },
  });
  await prisma.productOptionGroup.createMany({
    data: grupos.map((groupId, i) => ({ productId: id, groupId, position: i })),
  });
  console.log(`  produto "${name}"  R$ ${reais.toFixed(2)}  ${grupos.length} grupo(s)`);
}

console.log('PIZZARIA ESTILO "TAMANHO E O PRODUTO" (Pizza Prime)');
const massas = await grupo('Massas', 0, 1, [['Massa Tradicional', 0], ['Massa Integral', 4]]);
const sabores35 = await grupo('Sabores 35cm', 2, 2, [
  ['1/2 Calabresa Paulistana', 42.95],
  ['1/2 Napolitana', 46.45],
  ['1/2 Frango com Catupiry', 49.95],
  ['1/2 Palmito Especiale', 60.95],
  ['1/2 Camarão Poró', 66.45],
]);
const sabores25 = await grupo('Sabores 25cm', 1, 1, [
  ['Calabresa Paulistana', 62.9],
  ['Napolitana', 66.9],
  ['Frango com Catupiry', 73.9],
  ['Palmito Especiale', 88.9],
  ['Camarão Poró', 99.9],
]);
const borda35 = await grupo('Borda 35cm', 0, 1, [['Catupiry', 15.9], ['Cheddar', 15.9], ['Chocolate', 10.9]]);
const borda25 = await grupo('Borda 25cm', 0, 1, [['Catupiry', 11.9], ['Cheddar', 11.9], ['Chocolate', 8.9]]);

await produto('Pizza Grande de 35cm (8 pedaços)', 0, 'Pizzas Salgadas', [massas, sabores35, borda35], 'Serve 4 pessoas. Escolha até 2 sabores.');
await produto('Pizza Broto de 25cm (6 pedaços)', 0, 'Pizzas Salgadas', [massas, sabores25, borda25], 'Serve 2 pessoas.');

console.log('\nPIZZARIA ESTILO "SABOR E O PRODUTO" (Skina)');
const tamanho = await grupo('Tamanho da pizza', 1, 1, [['Broto 25cm', 0], ['Média 30cm', 12], ['Grande 35cm', 24]]);
for (const [nome, desc] of [
  ['Pizza Calabresa', 'mussarela, molho, calabresa e orégano'],
  ['Pizza Marguerita', 'mussarela, molho, tomate e manjericão'],
  ['Pizza Quatro Queijos', 'mussarela, parmesão, provolone, catupiry'],
] as const) {
  await produto(nome, 45, 'Pizzas por Sabor', [tamanho], desc);
}

console.log('\nAÇAÍ — tamanho e o produto, adicionais somam');
const baseAcai = await grupo('Base do açaí', 1, 1, [['Açaí', 0], ['Creme de Ninho', 0], ['Misto', 0]]);
const frutas = await grupo('Frutas', 0, 3, [['Banana', 5], ['Morango', 6], ['Kiwi', 6]]);
const cremes = await grupo('Cremes e lácteos', 0, 4, [
  ['Leite condensado', 5], ['Leite em pó', 5], ['Nutella', 10.5], ['Creme de Ovomaltine', 10.5],
]);
const cereais = await grupo('Cereais', 0, 8, [['Castanha', 4.5], ['Granola', 4.5], ['Paçoca', 5], ['Creme de pistache', 11]]);
for (const [nome, preco] of [['Açaí 200ml', 13], ['Açaí 300ml', 15], ['Açaí 400ml', 17], ['Açaí 500ml', 20]] as const) {
  await produto(nome, preco, 'Açaí', [baseAcai, frutas, cremes, cereais]);
}

console.log('\nMARMITEX — tamanho e o produto, prato e a escolha');
/*
 * Quatro produtos avulsos — Media/Grande x Bisteca/Feijoada — e o que o Dl
 * Marmitex faz no iFood, e funciona para eles. Aqui fica melhor com dois
 * produtos e um grupo de prato: com dez pratos, a versao avulsa daria vinte
 * linhas no cardapio, e o cliente rolaria a lista inteira duas vezes para
 * comparar tamanho.
 *
 * O prato nao muda o preco — quem manda e o tamanho. Grupo de preco zero,
 * como a base do acai: existe para capturar a DECISAO que a cozinha precisa.
 */
const prato = await grupo('Prato da marmita', 1, 1, [
  ['Bisteca acebolada', 0],
  ['Feijoada', 0],
  ['Filé de frango grelhado', 0],
  ['Costela de boi', 0],
  ['Parmegiana', 0],
]);
await produto('Marmita Média', 30, 'Marmitas', [prato], 'Arroz, feijão, macarrão e farofa.');
await produto('Marmita Grande', 35, 'Marmitas', [prato], 'Mesma comida, porção maior.');

await prisma.$disconnect();
