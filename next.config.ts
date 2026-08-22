import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' empacota só o necessário para rodar: a imagem Docker sai na
  // casa das dezenas de MB em vez de centenas.
  //
  // Na Vercel ele precisa ficar de fora. A plataforma reescreve a config
  // durante o build ("Applying modifyConfig from Vercel") e o rastreamento de
  // arquivos se perde no caminho — o build morre no fim com ENOENT em
  // `.next/next-server.js.nft.json`, depois de já ter compilado tudo. Lá o
  // empacotamento é da própria plataforma, então não há o que otimizar.
  output: process.env.VERCEL ? undefined : 'standalone',
};

export default nextConfig;
