"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho";
import { createClient } from "@/lib/supabase/client";
import { UFS } from "@/lib/geo/ufs";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatar = (centavos: number) => moeda.format(centavos / 100);

/**
 * Carrinho e fechamento do pedido.
 *
 * O CEP não é burocracia: é dele que sai a UF, e é a UF que acende o mapa do
 * painel. Um pedido sem estado entra no faturamento e some da distribuição por
 * região — a pergunta que o painel existe para responder.
 *
 * Não há cobrança aqui. O pedido nasce em 'aguardando_pagamento' e o acerto é
 * por WhatsApp. Quando o Mercado Pago entrar, é ele que promove o status.
 */
export function Checkout({ demo }: { demo: boolean }) {
  const { itens, totalCentavos, mudarQuantidade, remover, esvaziar, pronto } = useCarrinho();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [numero, setNumero] = useState<number | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  /** ViaCEP: preenche cidade e estado sozinho, para ninguém digitar errado. */
  async function consultarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (!dados.erro) {
        setCidade(dados.localidade ?? "");
        setUf(dados.uf ?? "");
      }
    } catch {
      // CEP é conveniência: se o ViaCEP não responder, os campos continuam
      // editáveis à mão e o pedido segue.
    } finally {
      setBuscandoCep(false);
    }
  }

  async function fechar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (demo || itens.length === 0) return;
    setErro(null);

    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        user_id: user?.id ?? null,
        nome: String(dados.get("nome") ?? "").trim(),
        email: String(dados.get("email") ?? "").trim() || null,
        telefone: String(dados.get("telefone") ?? "").trim() || null,
        cep: String(dados.get("cep") ?? "").trim() || null,
        cidade: cidade || null,
        uf: uf || null,
        origem: "site",
        status: "aguardando_pagamento",
        total_centavos: totalCentavos,
        observacoes: String(dados.get("observacoes") ?? "").trim() || null,
      })
      .select("id, numero")
      .single();

    if (error || !pedido) {
      setEnviando(false);
      setErro(
        "Não foi possível registrar o pedido. Se você não tem conta, crie uma primeiro — " +
          "é ela que permite acompanhar o andamento."
      );
      return;
    }

    const { error: erroItens } = await supabase.from("pedido_itens").insert(
      itens.map((i) => ({
        pedido_id: pedido.id,
        sku: i.sku,
        nome: i.nome,
        preco_centavos: i.precoCentavos,
        quantidade: i.quantidade,
      }))
    );
    setEnviando(false);

    if (erroItens) {
      setErro("O pedido foi criado, mas as peças não foram salvas. Entre em contato pelo WhatsApp.");
      return;
    }

    esvaziar();
    setNumero(pedido.numero);
  }

  if (numero !== null) {
    return (
      <div className="checkout__confirmado">
        <p className="pdp__eyebrow">Pedido registrado</p>
        <p className="checkout__numero">#{numero}</p>
        <p className="pdp__nota" style={{ margin: "18px auto 0" }}>
          Anote esse número. A Florenza entra em contato para combinar o pagamento e o prazo
          de produção da peça.
        </p>
        <Link className="pdp__comprar" href="/" style={{ marginTop: 28 }}>
          Voltar à vitrine
        </Link>
      </div>
    );
  }

  // Antes de ler o localStorage não dá para saber se o carrinho está vazio;
  // mostrar "vazio" nesse instante faria a mensagem piscar para quem tem itens.
  if (!pronto) return <div style={{ minHeight: 240 }} />;

  if (itens.length === 0) {
    return (
      <div className="carrinho__vazio">
        <p>Seu carrinho está vazio.</p>
        <Link className="pdp__comprar" href="/aneis-formatura" style={{ marginTop: 24 }}>
          Ver as peças
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="carrinho__lista">
        {itens.map((item) => (
          <li className="carrinho__item" key={item.sku}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="carrinho__foto" src={item.imagemUrl} alt="" />
            <div style={{ flexGrow: 1, minWidth: 180 }}>
              <Link href={`/produto/${item.slug}`} className="carrinho__nome">{item.nome}</Link>
              <p className="carrinho__sku">Cód. {item.sku}</p>
            </div>

            <div className="carrinho__qtd">
              <button type="button" aria-label={`Menos um ${item.nome}`} onClick={() => mudarQuantidade(item.sku, item.quantidade - 1)}>
                <Minus aria-hidden size={13} />
              </button>
              <span>{item.quantidade}</span>
              <button type="button" aria-label={`Mais um ${item.nome}`} onClick={() => mudarQuantidade(item.sku, item.quantidade + 1)}>
                <Plus aria-hidden size={13} />
              </button>
            </div>

            <span className="carrinho__preco">{formatar(item.precoCentavos * item.quantidade)}</span>

            <button type="button" aria-label={`Remover ${item.nome}`} onClick={() => remover(item.sku)} style={{ color: "var(--ink-dim)" }}>
              <Trash2 aria-hidden size={15} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>

      <div className="carrinho__total">
        <span className="carrinho__total-rotulo">Total</span>
        <span className="carrinho__total-valor">{formatar(totalCentavos)}</span>
      </div>

      <section className="checkout">
        <p className="pdp__eyebrow">Seus dados</p>
        <h2 className="pdp__nome" style={{ fontSize: 28 }}>Para onde vai a peça</h2>

        {demo && (
          <div className="checkout__aviso" style={{ marginTop: 22, marginBottom: 0 }}>
            O Supabase ainda não está conectado, então o pedido não pode ser registrado.
            Preencha <code>.env.local</code> para ativar o fechamento.
          </div>
        )}

        <form onSubmit={fechar}>
          <div className="checkout__grade">
            <div className="checkout__campo">
              <label className="checkout__rotulo" htmlFor="ck-nome">Nome completo</label>
              <input className="checkout__input" id="ck-nome" name="nome" required placeholder="Seu nome" />
            </div>
            <div className="checkout__campo">
              <label className="checkout__rotulo" htmlFor="ck-tel">WhatsApp</label>
              <input className="checkout__input" id="ck-tel" name="telefone" type="tel" required placeholder="(00) 00000-0000" />
            </div>
            <div className="checkout__campo checkout__campo--largo">
              <label className="checkout__rotulo" htmlFor="ck-email">E-mail</label>
              <input className="checkout__input" id="ck-email" name="email" type="email" required placeholder="voce@exemplo.com" />
            </div>

            <div className="checkout__campo">
              <label className="checkout__rotulo" htmlFor="ck-cep">CEP</label>
              <input
                className="checkout__input"
                id="ck-cep"
                name="cep"
                inputMode="numeric"
                required
                placeholder="00000-000"
                onChange={(e) => consultarCep(e.target.value)}
              />
              <span className="checkout__dica">
                {buscandoCep ? "Buscando endereço…" : "Preenche cidade e estado automaticamente."}
              </span>
            </div>
            <div className="checkout__campo">
              <label className="checkout__rotulo" htmlFor="ck-cidade">Cidade</label>
              <input
                className="checkout__input"
                id="ck-cidade"
                required
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="checkout__campo">
              <label className="checkout__rotulo" htmlFor="ck-uf">Estado</label>
              <select className="checkout__input" id="ck-uf" required value={uf} onChange={(e) => setUf(e.target.value)}>
                <option value="">Selecione</option>
                {UFS.map((u) => (
                  <option key={u.uf} value={u.uf}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="checkout__campo checkout__campo--largo">
              <label className="checkout__rotulo" htmlFor="ck-obs">Observações</label>
              <input className="checkout__input" id="ck-obs" name="observacoes" placeholder="Tamanho do aro, gravação, prazo… (opcional)" />
            </div>
          </div>

          <button className="pdp__comprar" type="submit" disabled={enviando || demo} style={{ marginTop: 28, width: "100%" }}>
            {enviando && <Loader2 aria-hidden size={15} className="animate-spin" />}
            Enviar pedido · {formatar(totalCentavos)}
          </button>
        </form>

        {erro && <p className="checkout__erro" role="alert">{erro}</p>}

        <p className="pdp__nota">
          Nenhum pagamento acontece agora. O pedido chega para a Florenza, que entra em
          contato pelo WhatsApp para combinar a forma de pagamento e o prazo.
        </p>
      </section>
    </>
  );
}
