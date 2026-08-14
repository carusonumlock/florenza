import type { LucideIcon } from "lucide-react";

/** Cartão de indicador do topo do dashboard. */
export function StatCard({
  icone: Icone,
  rotulo,
  valor,
  nota,
  tom = "neutro",
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "neutro" | "bom" | "atencao" | "ruim";
}) {
  const classeTom =
    tom === "bom" ? " adm-card__valor--bom"
    : tom === "atencao" ? " adm-card__valor--atencao"
    : tom === "ruim" ? " adm-card__valor--ruim"
    : "";

  return (
    <div className="adm-card">
      <p className="adm-card__rotulo">
        <Icone aria-hidden size={14} strokeWidth={1.75} />
        {rotulo}
      </p>
      <p className={`adm-card__valor${classeTom}`}>{valor}</p>
      {nota && <p className="adm-card__nota">{nota}</p>}
    </div>
  );
}

/** Container de seção — o "cartão grande" que agrupa gráfico, lista e formulário. */
export function SectionCard({
  icone: Icone,
  titulo,
  acao,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="adm-secao">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="adm-secao__titulo">
          <Icone aria-hidden size={14} strokeWidth={1.75} />
          {titulo}
        </h3>
        {acao}
      </div>
      <div className="adm-secao__corpo">{children}</div>
    </section>
  );
}

/** Indicador menor, usado dentro de uma seção. */
export function MiniStat({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="adm-mini">
      <p className="adm-mini__rotulo">{rotulo}</p>
      <p className="adm-mini__valor">{valor}</p>
    </div>
  );
}

/**
 * Estado vazio. Existe porque com o banco recém-criado TODOS os gráficos nascem
 * sem dado — e um gráfico vazio, com eixos e sem linha, parece defeito. Uma
 * frase explicando que ainda não há venda registrada não parece.
 */
export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="adm-vazio">{children}</p>;
}
