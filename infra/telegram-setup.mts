/**
 * Liga o bot do Telegram: confere o token, publica as variaveis e registra o
 * webhook.
 *
 * O token e lido do .env e nunca e impresso. O que aparece na tela e so o
 * suficiente para saber que deu certo: o nome do bot e o endereco do webhook.
 *
 * Idempotente: rodar de novo so reconfirma o webhook, que o Telegram trata como
 * a mesma inscricao.
 *
 * Uso:  npx tsx infra/telegram-setup.mts
 */
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { TelegramSender } from '../src/infrastructure/messaging/telegram';

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const segredo = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const base = 'https://levoentregas.vercel.app';

if (!token) throw new Error('TELEGRAM_BOT_TOKEN vazio no .env');
if (!segredo) throw new Error('TELEGRAM_WEBHOOK_SECRET vazio no .env');

const bot = new TelegramSender(token);

const usuario = await bot.username();
if (!usuario) throw new Error('O Telegram nao aceitou o token. Ele foi revogado?');
console.log(`bot: @${usuario}`);

/*
 * As variaveis vao para a Vercel pela entrada padrao do CLI, nao por argumento:
 * argumento de processo aparece em `ps` para qualquer um logado na maquina.
 */
function publicar(chave: string, valor: string) {
  try {
    execFileSync('npx', ['vercel', 'env', 'rm', chave, 'production', '--yes'], {
      stdio: 'ignore',
    });
  } catch {
    // Nao existia. E o caso comum na primeira vez.
  }
  execFileSync('npx', ['vercel', 'env', 'add', chave, 'production'], {
    input: valor,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  console.log(`  ${chave} publicada`);
}

publicar('TELEGRAM_BOT_TOKEN', token);
publicar('TELEGRAM_WEBHOOK_SECRET', segredo);

const url = `${base}/api/integrations/telegram/webhook`;
const ok = await bot.setWebhook(url, segredo);
console.log(ok ? `webhook registrado: ${url}` : 'FALHOU ao registrar o webhook');
