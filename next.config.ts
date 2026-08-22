import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o necessário para rodar: a imagem Docker sai na casa das
  // dezenas de MB em vez de centenas.
  output: 'standalone',
  /* config options here */
};

export default nextConfig;
