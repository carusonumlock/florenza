"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { MiniStat, SectionCard, Vazio } from "@/components/admin/Primitivos";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/admin/format";
import { UFS } from "@/lib/geo/ufs";
import type { ClienteAdmin } from "@/lib/admin/listas";

export function ClientesSection({ clientes, demo }: { clientes: ClienteAdmin[]; demo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "site" | "manual">("todos");

  const doSite = clientes.filter((c) => c.origem === "site").length;
  const manuais = clientes.filter((c) => c.origem === "manual").length;
  const visiveis = filtro === "todos" ? clientes : clientes.filter((c) => c.origem === filtro);

  async function cadastrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (demo) return;
    setErro(null);

    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const nome = String(dados.get("nome") ?? "").trim();
    if (!nome) return;

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("clientes_manuais").insert({
      nome,
      telefone: String(dados.get("telefone") ?? "").trim() || null,
      email: String(dados.get("email") ?? "").trim() || null,
      cidade: String(dados.get("cidade") ?? "").trim() || null,
      uf: String(dados.get("uf") ?? "") || null,
      observacoes: String(dados.get("observacoes") ?? "").trim() || null,
    });
    setEnviando(false);

    if (error) {
      setErro("Não foi possível salvar o cliente. Tente de novo.");
      return;
    }
    formulario.reset();
    router.refresh();
  }

  async function remover(id: string) {
    if (demo) return;
    const supabase = createClient();
    const { error } = await supabase.from("clientes_manuais").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível remover. Só é possível apagar cadastros feitos à mão.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionCard icone={Users} titulo="Quem são os clientes">
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat rotulo="Total" valor={String(clientes.length)} />
          <MiniStat rotulo="Criaram conta no site" valor={String(doSite)} />
          <MiniStat rotulo="Cadastrados à mão" valor={String(manuais)} />
        </div>
        <p className="adm-mapa__dica-linha mt-4">
          Quem cria conta no site entra nesta lista sozinho, no mesmo instante — não há
          sincronização a rodar nem botão a apertar.
        </p>
      </SectionCard>

      <SectionCard icone={UserPlus} titulo="Cadastrar cliente à mão">
        <form className="adm-form" onSubmit={cadastrar}>
          <div className="adm-campo grow min-w-44">
            <label className="adm-campo__rotulo" htmlFor="cli-nome">Nome</label>
            <input className="adm-input" id="cli-nome" name="nome" required placeholder="Nome do cliente" />
          </div>
          <div className="adm-campo w-40">
            <label className="adm-campo__rotulo" htmlFor="cli-tel">Telefone</label>
            <input className="adm-input" id="cli-tel" name="telefone" type="tel" placeholder="(00) 00000-0000" />
          </div>
          <div className="adm-campo w-52">
            <label className="adm-campo__rotulo" htmlFor="cli-email">E-mail</label>
            <input className="adm-input" id="cli-email" name="email" type="email" placeholder="email@exemplo.com" />
          </div>
          <div className="adm-campo w-40">
            <label className="adm-campo__rotulo" htmlFor="cli-cidade">Cidade</label>
            <input className="adm-input" id="cli-cidade" name="cidade" placeholder="Cidade" />
          </div>
          <div className="adm-campo w-24">
            <label className="adm-campo__rotulo" htmlFor="cli-uf">UF</label>
            <select className="adm-input" id="cli-uf" name="uf" defaultValue="">
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u.uf} value={u.uf}>{u.uf}</option>
              ))}
            </select>
          </div>
          <div className="adm-campo grow min-w-44">
            <label className="adm-campo__rotulo" htmlFor="cli-obs">Observações</label>
            <input className="adm-input" id="cli-obs" name="observacoes" placeholder="Opcional" />
          </div>
          <button className="adm-botao" type="submit" disabled={enviando || demo}>
            {enviando && <Loader2 aria-hidden size={14} className="animate-spin" />}
            Adicionar
          </button>
        </form>
        {erro && <p className="adm-erro" role="alert">{erro}</p>}
      </SectionCard>

      <SectionCard
        icone={Users}
        titulo={`Lista de clientes (${clientes.length})`}
        acao={
          <div className="flex gap-2">
            {(["todos", "site", "manual"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`adm-botao adm-botao--fantasma${filtro === f ? " is-active" : ""}`}
                onClick={() => setFiltro(f)}
              >
                {f === "todos" ? "Todos" : f === "site" ? "Do site" : "À mão"}
              </button>
            ))}
          </div>
        }
      >
        {visiveis.length === 0 ? (
          <Vazio>Nenhum cliente cadastrado ainda.</Vazio>
        ) : (
          <ul className="adm-lista">
            {visiveis.map((cliente) => (
              <li className="adm-lista__item" key={cliente.id}>
                <div className="min-w-52 grow">
                  <span className="adm-lista__nome">{cliente.nome}</span>
                  <p className="adm-lista__meta">
                    {[cliente.email, cliente.telefone].filter(Boolean).join(" · ") || "sem contato registrado"}
                  </p>
                  {cliente.observacoes && <p className="adm-lista__meta">{cliente.observacoes}</p>}
                </div>
                <span className="adm-lista__meta">
                  {[cliente.cidade, cliente.uf].filter(Boolean).join("/")}
                </span>
                <span className="adm-lista__meta">{formatarData(cliente.created_at)}</span>
                <span className="adm-tag">{cliente.origem === "site" ? "Conta no site" : "Cadastro à mão"}</span>
                {/* Só cadastro manual some daqui. Apagar quem tem conta é apagar
                    a conta da pessoa, o que é outra operação e não cabe num
                    ícone de lixeira ao lado de uma linha de lista. */}
                {cliente.origem === "manual" ? (
                  <button
                    type="button"
                    className="adm-icone"
                    aria-label={`Remover ${cliente.nome}`}
                    disabled={demo}
                    onClick={() => remover(cliente.id)}
                  >
                    <Trash2 aria-hidden size={14} strokeWidth={1.75} />
                  </button>
                ) : (
                  <span className="adm-icone" aria-hidden style={{ opacity: 0.25 }}>
                    <Trash2 size={14} strokeWidth={1.75} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
