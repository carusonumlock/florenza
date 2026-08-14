/* As 27 UFs e suas regiões, do lado do JavaScript.
 *
 * Espelha a tabela `public.ufs` criada em
 * supabase/migrations/20260814000100_geografia.sql, que continua sendo a fonte
 * de verdade — é ela que valida `pedidos.uf` no banco.
 *
 * A cópia existe por dois motivos concretos: o seletor de estado do checkout
 * precisa da lista antes de haver qualquer sessão ou requisição, e o painel em
 * modo de demonstração precisa agregar por região sem banco nenhum. São 27
 * linhas que mudam quando o IBGE mudar a divisão política do país.
 */
export type Regiao = "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";

export type UF = { uf: string; nome: string; regiao: Regiao };

export const UFS: UF[] = [
  { uf: "AC", nome: "Acre", regiao: "Norte" },
  { uf: "AL", nome: "Alagoas", regiao: "Nordeste" },
  { uf: "AM", nome: "Amazonas", regiao: "Norte" },
  { uf: "AP", nome: "Amapá", regiao: "Norte" },
  { uf: "BA", nome: "Bahia", regiao: "Nordeste" },
  { uf: "CE", nome: "Ceará", regiao: "Nordeste" },
  { uf: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste" },
  { uf: "ES", nome: "Espírito Santo", regiao: "Sudeste" },
  { uf: "GO", nome: "Goiás", regiao: "Centro-Oeste" },
  { uf: "MA", nome: "Maranhão", regiao: "Nordeste" },
  { uf: "MG", nome: "Minas Gerais", regiao: "Sudeste" },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "Centro-Oeste" },
  { uf: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste" },
  { uf: "PA", nome: "Pará", regiao: "Norte" },
  { uf: "PB", nome: "Paraíba", regiao: "Nordeste" },
  { uf: "PE", nome: "Pernambuco", regiao: "Nordeste" },
  { uf: "PI", nome: "Piauí", regiao: "Nordeste" },
  { uf: "PR", nome: "Paraná", regiao: "Sul" },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste" },
  { uf: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste" },
  { uf: "RO", nome: "Rondônia", regiao: "Norte" },
  { uf: "RR", nome: "Roraima", regiao: "Norte" },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "Sul" },
  { uf: "SC", nome: "Santa Catarina", regiao: "Sul" },
  { uf: "SE", nome: "Sergipe", regiao: "Nordeste" },
  { uf: "SP", nome: "São Paulo", regiao: "Sudeste" },
  { uf: "TO", nome: "Tocantins", regiao: "Norte" },
];

export const REGIOES: Regiao[] = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

const porSigla = new Map(UFS.map((u) => [u.uf, u]));

export const buscarUF = (uf: string | null | undefined): UF | undefined =>
  uf ? porSigla.get(uf.toUpperCase()) : undefined;
