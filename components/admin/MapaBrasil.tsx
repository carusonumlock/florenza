"use client";

import { useMemo, useState } from "react";
import { CONTORNOS_UF, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/geo/brasil-uf";
import { formatarPreco, plural } from "@/lib/admin/format";
import type { LinhaUF } from "@/lib/admin/dashboard-data";

/**
 * Mapa coroplético do Brasil — onde a Florenza vende.
 *
 * SVG inline, sem biblioteca de mapa e sem rede: os 27 contornos vêm de
 * lib/geo/brasil-uf.ts, gerado uma vez a partir da malha do IBGE e versionado.
 *
 * A escala é por RAIZ QUADRADA do faturamento, não linear. Com um estado
 * concentrando boa parte das vendas (São Paulo, na prática), a escala linear
 * pinta ele de dourado forte e joga todo o resto do país num tom quase
 * indistinguível do vazio — o mapa vira "SP e mais nada". A raiz comprime o
 * topo e abre a faixa de baixo, que é onde estão as diferenças que interessam.
 *
 * O mapa responde "onde"; quem responde "quanto" com precisão é o gráfico de
 * barras ao lado. Ler valor por tom de cor é impreciso por natureza, então os
 * dois trabalham juntos em vez de o mapa tentar fazer os dois papéis.
 */
export function MapaBrasil({
  dados,
  regiaoSelecionada,
  onSelecionarRegiao,
}: {
  dados: LinhaUF[];
  regiaoSelecionada: string | null;
  onSelecionarRegiao: (regiao: string | null) => void;
}) {
  const [hover, setHover] = useState<{ linha: LinhaUF; x: number; y: number } | null>(null);

  const porUF = useMemo(() => new Map(dados.map((l) => [l.uf, l])), [dados]);
  const maximo = useMemo(() => Math.max(...dados.map((l) => l.totalCentavos), 0), [dados]);

  function corDaUF(linha: LinhaUF | undefined): string {
    if (!linha || linha.totalCentavos === 0 || maximo === 0) return "var(--ivory-line)";
    const intensidade = Math.sqrt(linha.totalCentavos / maximo);
    // Interpola do bege da vitrine até o dourado escuro da marca. Mesma paleta
    // do site: o painel não inventa cor nova.
    return `color-mix(in srgb, var(--gold-ink) ${Math.round(intensidade * 100)}%, var(--ivory-soft))`;
  }

  return (
    <div className="relative">
      <svg
        className="adm-mapa"
        viewBox={`0 0 ${MAPA_LARGURA} ${MAPA_ALTURA}`}
        role="img"
        aria-label="Mapa do Brasil com o faturamento por estado"
      >
        {CONTORNOS_UF.map((contorno) => {
          const linha = porUF.get(contorno.uf);
          const apagada =
            regiaoSelecionada !== null && linha?.regiao !== regiaoSelecionada;

          return (
            <path
              key={contorno.uf}
              d={contorno.d}
              className={`adm-mapa__uf${linha?.totalCentavos ? "" : " is-apagada"}`}
              fill={corDaUF(linha)}
              opacity={apagada ? 0.25 : 1}
              onMouseEnter={(e) => {
                if (!linha) return;
                const caixa = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setHover({
                  linha,
                  x: e.clientX - caixa.left,
                  y: e.clientY - caixa.top,
                });
              }}
              onMouseMove={(e) => {
                if (!linha) return;
                const caixa = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setHover({ linha, x: e.clientX - caixa.left, y: e.clientY - caixa.top });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (!linha) return;
                onSelecionarRegiao(regiaoSelecionada === linha.regiao ? null : linha.regiao);
              }}
            >
              <title>
                {linha ? `${linha.ufNome} — ${formatarPreco(linha.totalCentavos)}` : contorno.uf}
              </title>
            </path>
          );
        })}
      </svg>

      {hover && (
        <div
          className="adm-mapa__dica"
          style={{
            left: Math.min(hover.x + 14, 240),
            top: Math.max(hover.y - 10, 0),
          }}
        >
          <p className="adm-mapa__dica-uf">{hover.linha.ufNome}</p>
          <p className="adm-mapa__dica-linha">{formatarPreco(hover.linha.totalCentavos)}</p>
          <p className="adm-mapa__dica-linha">
            {plural(hover.linha.pedidos, "pedido", "pedidos")} · {hover.linha.regiao}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="adm-escala">
          <span className="adm-legenda">Menos</span>
          <span className="adm-escala__faixa" aria-hidden="true" />
          <span className="adm-legenda">Mais</span>
        </div>
        {regiaoSelecionada && (
          <button type="button" className="adm-botao adm-botao--fantasma" onClick={() => onSelecionarRegiao(null)}>
            Ver o Brasil inteiro
          </button>
        )}
      </div>
    </div>
  );
}
