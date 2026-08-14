"use client";

import { useState } from "react";
import { useCarrinho, type ItemCarrinho } from "@/lib/carrinho";

/**
 * O "Comprar" do card e da página de produto.
 *
 * Continua sendo um `<a>`, e não um `<button>`, de propósito: `.ringCard__buy`
 * foi escrito para um link, e sem o preflight do Tailwind um `<button>` traz a
 * fonte e a borda padrão do navegador — mudaria a aparência do card, que é
 * justamente o que não pode acontecer. O papel de botão fica no `role`.
 */
export function BotaoComprar({
  produto,
  className = "ringCard__buy",
}: {
  produto: Omit<ItemCarrinho, "quantidade">;
  className?: string;
}) {
  const { adicionar } = useCarrinho();
  const [adicionado, setAdicionado] = useState(false);

  return (
    // O <Link> do Next é o certo para navegar, mas aqui o clique normal NÃO
    // navega — ele adiciona ao carrinho. O href existe para o link continuar
    // funcionando com Ctrl/Cmd e para quem estiver sem JavaScript.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      className={className}
      href="/carrinho"
      role="button"
      aria-label={`Comprar ${produto.nome}`}
      onClick={(evento) => {
        // Segurar Ctrl/Cmd ou clicar com o botão do meio continua abrindo o
        // carrinho em outra aba, como qualquer link.
        if (evento.metaKey || evento.ctrlKey || evento.button !== 0) return;
        evento.preventDefault();
        adicionar(produto);
        setAdicionado(true);
        window.setTimeout(() => setAdicionado(false), 1800);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
      {adicionado ? "Adicionado ✓" : "Comprar"}
    </a>
  );
}
