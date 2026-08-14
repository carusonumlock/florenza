import type { Metadata } from "next";
import { ContaFormulario } from "@/components/ContaFormulario";
import { Footer } from "@/components/Footer";
import { supabaseConfigurado } from "@/lib/supabase/config";

import "./conta.css";

export const metadata: Metadata = {
  title: "Minha conta — Florenza",
  robots: { index: false, follow: false },
};

export default async function PaginaConta({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const demo = !supabaseConfigurado();
  const pedido = (await searchParams).redirect;

  // Só caminho interno é aceito como destino. Sem esta checagem, um link como
  // /conta?redirect=https://site-falso.com levaria a pessoa para fora logo
  // depois de ela digitar a senha — o padrão clássico de redirecionamento
  // aberto.
  const redirect = pedido && pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  return (
    <>
      <main className="conta">
        <div className="conta__caixa">
          <p className="conta__eyebrow">Florenza</p>
          <h1 className="conta__titulo">Minha conta</h1>
          <p className="conta__sub">
            Acompanhe seus pedidos e guarde suas peças favoritas.
          </p>

          {demo && (
            <div className="conta__aviso" style={{ marginTop: 26, marginBottom: 0 }}>
              <strong>Modo demonstração.</strong> O Supabase ainda não está conectado, então
              não é possível entrar nem criar conta. Basta preencher{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> em <code>.env.local</code>.
            </div>
          )}

          <ContaFormulario redirect={redirect} demo={demo} />
        </div>
      </main>

      <Footer colecoes="categoria" />
    </>
  );
}
