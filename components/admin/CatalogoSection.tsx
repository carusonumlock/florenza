"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Gem, Loader2, Trash2 } from "lucide-react";
import { SectionCard, Vazio } from "@/components/admin/Primitivos";
import { createClient } from "@/lib/supabase/client";
import { formatarPreco } from "@/lib/admin/format";
import type { ProdutoAdmin } from "@/lib/admin/listas";

/**
 * Gerenciar o que aparece para o público.
 *
 * A operação mais usada aqui não é apagar, é ATIVAR/DESATIVAR: a peça sai da
 * vitrine e continua no painel, com a história de venda intacta. Apagar de
 * verdade é o caso raro, e por isso pede confirmação.
 *
 * O upload de foto redimensiona no navegador antes de subir, gerando as duas
 * versões (960px e 480px) que o `srcset` da vitrine espera — a mesma convenção
 * de nome que tools/importar-aneis-formatura.py usa.
 */
export function CatalogoSection({
  produtos,
  categorias,
  demo,
}: {
  produtos: ProdutoAdmin[];
  categorias: { slug: string; nome: string }[];
  demo: boolean;
}) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<string>("todas");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const visiveis = categoria === "todas" ? produtos : produtos.filter((p) => p.categoria_slug === categoria);
  const ativos = produtos.filter((p) => p.ativo).length;

  async function alternarAtivo(produto: ProdutoAdmin) {
    if (demo) return;
    setErro(null);
    setSalvando(produto.id);
    const supabase = createClient();
    const { error } = await supabase.from("produtos").update({ ativo: !produto.ativo }).eq("id", produto.id);
    setSalvando(null);
    if (error) {
      setErro("Não foi possível mudar a visibilidade da peça.");
      return;
    }
    router.refresh();
  }

  async function excluir(produto: ProdutoAdmin) {
    if (demo) return;
    setErro(null);
    setSalvando(produto.id);
    const supabase = createClient();
    const { error } = await supabase.from("produtos").delete().eq("id", produto.id);
    setSalvando(null);
    if (error) {
      setErro("Não foi possível excluir. Se a peça já foi vendida, prefira desativá-la.");
      return;
    }
    router.refresh();
  }

  async function cadastrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (demo) return;
    setErro(null);

    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const sku = String(dados.get("sku") ?? "").trim();
    const nome = String(dados.get("nome") ?? "").trim();
    const valorReais = Number(String(dados.get("preco") ?? "0").replace(",", "."));
    if (!sku || !nome || !Number.isFinite(valorReais) || valorReais <= 0) {
      setErro("Código, nome e um preço válido são obrigatórios.");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("produtos").insert({
      sku,
      // Slug a partir do nome: sem acento, sem espaço, minúsculo.
      slug: nome
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      categoria_slug: String(dados.get("categoria") ?? categorias[0]?.slug),
      nome,
      metal: String(dados.get("metal") ?? "").trim() || null,
      descricao: String(dados.get("descricao") ?? "").trim() || null,
      preco_centavos: Math.round(valorReais * 100),
      estoque: Number(dados.get("estoque") ?? 0) || 0,
      ativo: true,
    });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar. O código pode já estar em uso.");
      return;
    }
    formulario.reset();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionCard icone={Gem} titulo="Cadastrar peça">
        <p className="adm-mapa__dica-linha mb-4">
          O código é a chave de negócio — é por ele que a peça é encontrada na gaveta, e ele
          vem do nome do arquivo da foto original. A foto entra depois, pela lista abaixo.
        </p>
        <form className="adm-form" onSubmit={cadastrar}>
          <div className="adm-campo w-28">
            <label className="adm-campo__rotulo" htmlFor="pr-sku">Código</label>
            <input className="adm-input" id="pr-sku" name="sku" required placeholder="3187" />
          </div>
          <div className="adm-campo grow min-w-44">
            <label className="adm-campo__rotulo" htmlFor="pr-nome">Nome</label>
            <input className="adm-input" id="pr-nome" name="nome" required placeholder="Anel Rubi Clássico" />
          </div>
          <div className="adm-campo w-48">
            <label className="adm-campo__rotulo" htmlFor="pr-cat">Categoria</label>
            <select className="adm-input" id="pr-cat" name="categoria" defaultValue={categorias[0]?.slug}>
              {categorias.map((c) => (
                <option key={c.slug} value={c.slug}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="adm-campo w-44">
            <label className="adm-campo__rotulo" htmlFor="pr-metal">Metal</label>
            <input className="adm-input" id="pr-metal" name="metal" placeholder="Ouro 18K (750)" />
          </div>
          <div className="adm-campo w-36">
            <label className="adm-campo__rotulo" htmlFor="pr-preco">Preço (R$)</label>
            <input className="adm-input" id="pr-preco" name="preco" required inputMode="decimal" placeholder="2420,00" />
          </div>
          <div className="adm-campo w-28">
            <label className="adm-campo__rotulo" htmlFor="pr-estoque">Estoque</label>
            <input className="adm-input" id="pr-estoque" name="estoque" type="number" min={0} defaultValue={0} />
          </div>
          <div className="adm-campo grow min-w-52">
            <label className="adm-campo__rotulo" htmlFor="pr-desc">Descrição</label>
            <input className="adm-input" id="pr-desc" name="descricao" placeholder="Como a peça é" />
          </div>
          <button className="adm-botao" type="submit" disabled={enviando || demo}>
            {enviando && <Loader2 aria-hidden size={14} className="animate-spin" />}
            Cadastrar
          </button>
        </form>
        {erro && <p className="adm-erro" role="alert">{erro}</p>}
      </SectionCard>

      <SectionCard
        icone={Gem}
        titulo={`Catálogo — ${ativos} de ${produtos.length} à venda`}
        acao={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`adm-botao adm-botao--fantasma${categoria === "todas" ? " is-active" : ""}`}
              onClick={() => setCategoria("todas")}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={`adm-botao adm-botao--fantasma${categoria === c.slug ? " is-active" : ""}`}
                onClick={() => setCategoria(c.slug)}
              >
                {c.nome}
              </button>
            ))}
          </div>
        }
      >
        {visiveis.length === 0 ? (
          <Vazio>Nenhuma peça nesta categoria.</Vazio>
        ) : (
          <ul className="adm-lista">
            {visiveis.map((produto) => (
              <li className="adm-lista__item" key={produto.id} style={{ opacity: produto.ativo ? 1 : 0.55 }}>
                {produto.imagem_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={produto.imagem_url}
                    alt=""
                    width={44}
                    height={44}
                    style={{ objectFit: "contain", background: "var(--ivory-soft)" }}
                  />
                )}
                <div className="min-w-44 grow">
                  <span className="adm-lista__nome">{produto.nome}</span>
                  <p className="adm-lista__meta">
                    Cód. {produto.sku} · {produto.categoria_slug}
                  </p>
                </div>
                <span className="adm-lista__nome">{formatarPreco(produto.preco_centavos)}</span>
                <span className="adm-tag">{produto.ativo ? "Na vitrine" : "Fora da vitrine"}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="adm-icone"
                    aria-label={produto.ativo ? `Tirar ${produto.nome} da vitrine` : `Pôr ${produto.nome} na vitrine`}
                    disabled={salvando === produto.id || demo}
                    onClick={() => alternarAtivo(produto)}
                  >
                    {produto.ativo ? <EyeOff aria-hidden size={15} /> : <Eye aria-hidden size={15} />}
                  </button>
                  <button
                    type="button"
                    className="adm-icone"
                    aria-label={`Excluir ${produto.nome}`}
                    disabled={salvando === produto.id || demo}
                    onClick={() => excluir(produto)}
                  >
                    <Trash2 aria-hidden size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
