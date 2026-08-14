import type { Metadata } from "next";
import { GemDefs } from "@/components/GemDefs";
import { Navbar } from "@/components/Navbar";
import { Reveal } from "@/components/Reveal";
import { VideoAutoplay } from "@/components/VideoAutoplay";

// A ordem importa e é a mesma das páginas antigas: primeiro as camadas do
// Tailwind, depois style.css, depois aliancas.css. categoria.css entra só nas
// páginas de categoria, e rings-3d.css só na home — igual aos <link> de antes.
import "./globals.css";
import "./estilos/style.css";
import "./estilos/aliancas.css";

export const metadata: Metadata = {
  title: "Florenza — Joalheria",
  description: "Joias que eternizam histórias e celebram o que realmente importa.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Mesmas famílias e pesos do site antigo. Mantido como <link> em vez de
            next/font de propósito: next/font renomeia a família, e todo o CSS
            do site pede "Cormorant Garamond" / "Alex Brush" / "Inter" pelo nome. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GemDefs />
        <Navbar />
        {children}
        {/* Efeitos que antes viviam em js/main.js e js/aliancas.js e agiam sobre
            o documento inteiro. Ficam no layout porque valem para todas as
            páginas; ambos rerodam a cada troca de rota. */}
        <Reveal />
        <VideoAutoplay />
      </body>
    </html>
  );
}
