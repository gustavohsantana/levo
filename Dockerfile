# Imagem do aplicativo.
#
# Existe para o Girô não ficar preso à Vercel: a mesma imagem roda na VM
# gratuita da Oracle, em qualquer VPS ou no Fly.io. Multi-stage para a imagem
# final não carregar as dependências de build.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# `--ignore-scripts` evita o postinstall (prisma generate) antes de o schema
# estar completo; geramos explicitamente no próximo estágio.
RUN npm ci --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Não roda como root: se alguém escapar do processo, escapa como ninguém.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs giro

COPY --from=build --chown=giro:nodejs /app/.next/standalone ./
COPY --from=build --chown=giro:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=giro:nodejs /app/public ./public
COPY --from=build --chown=giro:nodejs /app/prisma ./prisma

USER giro
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
