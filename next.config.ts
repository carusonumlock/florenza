import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O selo de dev do Next fica por cima da página e entra nas capturas de tela,
  // sujando a comparação com o site antigo. Como a paridade visual é o critério
  // de aceite desta migração, ele sai.
  devIndicators: false,

  images: {
    // As fotos de produto passam a morar no Supabase Storage. O host entra
    // aqui quando o projeto existir; até lá tudo vem de public/ e o padrão
    // basta. Ver supabase/migrations e tools/seed-catalogo.mjs.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
