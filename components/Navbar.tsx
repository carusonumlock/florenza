import Link from "next/link";
import { Gem } from "@/components/GemDefs";

/**
 * Mesma marcação da nav das quatro páginas antigas. Lá os links mudavam de
 * `#aliancas` (na home) para `index.html#aliancas` (nas categorias); com
 * roteamento de verdade, `/#aliancas` cobre os dois casos.
 */
export function Navbar() {
  return (
    <header className="nav">
      <div className="nav__inner">
        <Link className="nav__logo" href="/#top" aria-label="Florenza — início">
          <Gem className="nav__gem" />
          <span className="nav__word">Florenza</span>
        </Link>
        <nav className="nav__links">
          <Link href="/#aliancas">Alianças</Link>
          <Link href="/#categoryShowcase">Coleção</Link>
          <Link href="/#categorias">Categorias</Link>
          <Link href="/#contato">Contato</Link>
        </nav>
      </div>
    </header>
  );
}
