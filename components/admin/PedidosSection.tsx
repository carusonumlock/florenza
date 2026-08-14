"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ReceiptText } from "lucide-react";
import { SectionCard, Vazio } from "@/components/admin/Primitivos";
import { createClient } from "@/lib/supabase/client";
import { CLASSE_STATUS, ROTULO_ORIGEM, ROTULO_STATUS, formatarData, formatarPreco } from "@/lib/admin/format";
import { UFS } from "@/lib/geo/ufs";
import type { PedidoAdmin } from "@/lib/admin/listas";

const STATUS = ["aguardando_pagamento", "pago", "em_producao", "enviado", "entregue", "cancelado"] as const;

export function PedidosSection({ pedidos, demo }: { pedidos: PedidoAdmin[]; demo: boolean }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<string>("todos");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const visiveis = filtro === "todos" ? pedidos : pedidos.filter((p) => p.status === filtro);
  const contar = (status: string) => pedidos.filter((p) => p.status === status).length;

  async function trocarStatus(id: string, status: string) {
    if (demo) return;
    setErro(null);
    setSalvando(id);
    const supabase = createClient();
    const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
    setSalvando(null);
    // Conferir o erro do update não é zelo excessivo: se a RLS barrar, o
    // Supabase devolve sucesso com zero linhas afetadas e a mudança some sem
    // ninguém perceber.
    if (error) {
      setErro("Não foi possível mudar o status. Tente de novo.");
      return;
    }
    router.refresh();
  }

  async function lancarPedido(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (demo) return;
    setErro(null);

    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const nome = String(dados.get("nome") ?? "").trim();
    const valorReais = Number(String(dados.get("valor") ?? "0").replace(",", "."));
    if (!nome || !Number.isFinite(valorReais) || valorReais <= 0) {
      setErro("Informe ao menos o nome do cliente e um valor válido.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("pedidos").insert({
      nome,
      telefone: String(dados.get("telefone") ?? "").trim() || null,
      cidade: String(dados.get("cidade") ?? "").trim() || null,
      uf: String(dados.get("uf") ?? "") || null,
      origem: String(dados.get("origem") ?? "loja"),
      status: String(dados.get("status") ?? "pago"),
      // Reais digitados viram centavos aqui e nunca voltam a ser float.
      total_centavos: Math.round(valorReais * 100),
    });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível lançar o pedido. Confira os dados e tente de novo.");
      return;
    }
    formulario.reset();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionCard icone={Plus} titulo="Lançar venda feita fora do site">
        <p className="adm-mapa__dica-linha mb-4">
          Venda fechada por WhatsApp, Instagram ou no balcão. O estado é o que acende o mapa —
          sem ele o pedido entra no faturamento, mas não aparece na distribuição por região.
        </p>
        <form className="adm-form" onSubmit={lancarPedido}>
          <div className="adm-campo grow min-w-44">
            <label className="adm-campo__rotulo" htmlFor="ped-nome">Cliente</label>
            <input className="adm-input" id="ped-nome" name="nome" required placeholder="Nome de quem comprou" />
          </div>
          <div className="adm-campo w-40">
            <label className="adm-campo__rotulo" htmlFor="ped-tel">Telefone</label>
            <input className="adm-input" id="ped-tel" name="telefone" type="tel" placeholder="(00) 00000-0000" />
          </div>
          <div className="adm-campo w-40">
            <label className="adm-campo__rotulo" htmlFor="ped-cidade">Cidade</label>
            <input className="adm-input" id="ped-cidade" name="cidade" placeholder="Cidade" />
          </div>
          <div className="adm-campo w-28">
            <label className="adm-campo__rotulo" htmlFor="ped-uf">Estado</label>
            <select className="adm-input" id="ped-uf" name="uf" defaultValue="">
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u.uf} value={u.uf}>{u.uf}</option>
              ))}
            </select>
          </div>
          <div className="adm-campo w-36">
            <label className="adm-campo__rotulo" htmlFor="ped-valor">Valor (R$)</label>
            <input className="adm-input" id="ped-valor" name="valor" required inputMode="decimal" placeholder="2890,00" />
          </div>
          <div className="adm-campo w-36">
            <label className="adm-campo__rotulo" htmlFor="ped-origem">Origem</label>
            <select className="adm-input" id="ped-origem" name="origem" defaultValue="whatsapp">
              {Object.entries(ROTULO_ORIGEM).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
          <div className="adm-campo w-44">
            <label className="adm-campo__rotulo" htmlFor="ped-status">Situação</label>
            <select className="adm-input" id="ped-status" name="status" defaultValue="pago">
              {STATUS.map((s) => (
                <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
              ))}
            </select>
          </div>
          <button className="adm-botao" type="submit" disabled={enviando || demo}>
            {enviando && <Loader2 aria-hidden size={14} className="animate-spin" />}
            Lançar pedido
          </button>
        </form>
        {erro && <p className="adm-erro" role="alert">{erro}</p>}
      </SectionCard>

      <SectionCard
        icone={ReceiptText}
        titulo={`Pedidos (${pedidos.length})`}
        acao={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`adm-botao adm-botao--fantasma${filtro === "todos" ? " is-active" : ""}`}
              onClick={() => setFiltro("todos")}
            >
              Todos ({pedidos.length})
            </button>
            {STATUS.filter((s) => contar(s) > 0).map((s) => (
              <button
                key={s}
                type="button"
                className={`adm-botao adm-botao--fantasma${filtro === s ? " is-active" : ""}`}
                onClick={() => setFiltro(s)}
              >
                {ROTULO_STATUS[s]} ({contar(s)})
              </button>
            ))}
          </div>
        }
      >
        {visiveis.length === 0 ? (
          <Vazio>Nenhum pedido nesta situação.</Vazio>
        ) : (
          <ul className="adm-lista">
            {visiveis.map((pedido) => (
              <li className="adm-lista__item" key={pedido.id}>
                <div className="min-w-52 grow">
                  <span className="adm-lista__nome">
                    #{pedido.numero} · {pedido.nome}
                  </span>
                  <p className="adm-lista__meta">
                    {formatarData(pedido.created_at)}
                    {pedido.cidade ? ` · ${pedido.cidade}` : ""}
                    {pedido.uf ? `/${pedido.uf}` : ""}
                    {` · ${ROTULO_ORIGEM[pedido.origem] ?? pedido.origem}`}
                  </p>
                  {pedido.itens.length > 0 && (
                    <p className="adm-lista__meta">
                      {pedido.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}
                    </p>
                  )}
                </div>

                <span className="adm-lista__nome">{formatarPreco(pedido.total_centavos)}</span>

                <div className="flex items-center gap-3">
                  <span className={CLASSE_STATUS[pedido.status]}>{ROTULO_STATUS[pedido.status]}</span>
                  <select
                    className="adm-input w-44"
                    aria-label={`Mudar situação do pedido ${pedido.numero}`}
                    value={pedido.status}
                    disabled={salvando === pedido.id || demo}
                    onChange={(e) => trocarStatus(pedido.id, e.target.value)}
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
