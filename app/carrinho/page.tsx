import type { Metadata } from "next";
import { Checkout } from "@/components/Checkout";
import { Footer } from "@/components/Footer";
import { supabaseConfigurado } from "@/lib/supabase/config";

import "../produto/produto.css";

export const metadata: Metadata = {
  title: "Carrinho — Florenza",
  robots: { index: false, follow: false },
};

export default function PaginaCarrinho() {
  return (
    <>
      <main className="pdp">
        <p className="pdp__eyebrow">Florenza</p>
        <h1 className="pdp__titulo">Seu pedido</h1>
        <Checkout demo={!supabaseConfigurado()} />
      </main>
      <Footer colecoes="categoria" />
    </>
  );
}
