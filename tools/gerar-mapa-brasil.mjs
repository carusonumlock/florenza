/* Gera lib/geo/brasil-uf.ts — os contornos das 27 unidades federativas.
 *
 * Roda UMA VEZ (`npm run mapa`) e o resultado é versionado. Em produção o mapa
 * do painel não busca nada: nem CDN, nem API, nem biblioteca de mapa. É SVG
 * inline desenhado a partir deste arquivo.
 *
 * Por que não uma lib de mapa: react-simple-maps, Leaflet e companhia trazem
 * runtime, dependência de tiles e/ou de rede para desenhar 27 polígonos que
 * nunca mudam. Um path por estado resolve, sem nada disso.
 *
 * Fonte: malha territorial do IBGE (servicodados.ibge.gov.br), pública.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = resolve(RAIZ, "lib/geo/brasil-uf.ts");

const URL_IBGE =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR" +
  "?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=UF";

// A malha vem identificada pelo código do IBGE; a sigla é o que o resto do
// sistema usa (pedidos.uf, tabela ufs).
const CODIGO_PARA_UF = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL",
  28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP",
  41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

const LARGURA = 1000; // unidades do viewBox; a altura sai da proporção real

/* ---------- projeção ----------
 * Mercator. Para um país da largura do Brasil a diferença para projeções mais
 * "corretas" é imperceptível num mapa de 600px, e Mercator é a forma que todo
 * mundo reconhece como o formato do Brasil. */
const projetar = ([lon, lat]) => {
  const phi = (lat * Math.PI) / 180;
  return [(lon * Math.PI) / 180, Math.log(Math.tan(Math.PI / 4 + phi / 2))];
};

/* ---------- simplificação (Douglas–Peucker) ----------
 * A malha do IBGE traz muito mais detalhe do que um mapa de 600px consegue
 * mostrar. Sem simplificar, o arquivo passa de 2 MB e o navegador desenha
 * milhares de pontos que caem todos no mesmo pixel. */
function distanciaPerpendicular(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + tc * dx), y - (y1 + tc * dy));
}

function simplificar(pontos, tolerancia) {
  if (pontos.length < 3) return pontos;
  let maior = 0, indice = 0;
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = distanciaPerpendicular(pontos[i], pontos[0], pontos[pontos.length - 1]);
    if (d > maior) { maior = d; indice = i; }
  }
  if (maior <= tolerancia) return [pontos[0], pontos[pontos.length - 1]];
  return [
    ...simplificar(pontos.slice(0, indice + 1), tolerancia).slice(0, -1),
    ...simplificar(pontos.slice(indice), tolerancia),
  ];
}

/** Extrai todos os anéis externos de um Polygon ou MultiPolygon. */
function aneis(geometria) {
  if (geometria.type === "Polygon") return geometria.coordinates;
  if (geometria.type === "MultiPolygon") return geometria.coordinates.flat();
  return [];
}

async function main() {
  process.stdout.write("Baixando a malha das UFs no IBGE... ");
  const resposta = await fetch(URL_IBGE);
  if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
  const geojson = await resposta.json();
  console.log(`${geojson.features.length} feições.`);

  // 1) projeta tudo e descobre a caixa que envolve o país
  const estados = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const feicao of geojson.features) {
    const codigo = Number(feicao.properties?.codarea ?? feicao.id);
    const uf = CODIGO_PARA_UF[codigo];
    if (!uf) {
      console.warn(`  ! código ${codigo} sem sigla conhecida, ignorado`);
      continue;
    }

    const partes = aneis(feicao.geometry).map((anel) => anel.map(projetar));
    for (const parte of partes) {
      for (const [x, y] of parte) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    estados.push({ uf, partes });
  }

  // 2) escala para o viewBox, invertendo Y (no SVG ele cresce para baixo)
  const escala = LARGURA / (maxX - minX);
  const altura = Math.round((maxY - minY) * escala);
  const paraTela = ([x, y]) => [(x - minX) * escala, (maxY - y) * escala];

  // 3) simplifica no espaço da tela: a tolerância vira "meio pixel do viewBox",
  //    que é uma unidade com significado visual, ao contrário de graus.
  const TOLERANCIA = 0.5;
  const arred = (n) => Math.round(n * 10) / 10;

  const saida = estados
    .map(({ uf, partes }) => {
      const d = partes
        .map((parte) => {
          const pontos = simplificar(parte.map(paraTela), TOLERANCIA);
          // Ilhas minúsculas viram ruído numa tela de 600px.
          if (pontos.length < 4) return "";
          return (
            `M${pontos.map(([x, y]) => `${arred(x)} ${arred(y)}`).join("L")}Z`
          );
        })
        .filter(Boolean)
        .join("");
      return { uf, d };
    })
    .filter((e) => e.d.length > 0)
    .sort((a, b) => a.uf.localeCompare(b.uf));

  const cabecalho = `/* GERADO POR tools/gerar-mapa-brasil.mjs — não editar à mão.
 *
 * Contornos das 27 UFs, malha do IBGE (qualidade intermediária), projeção
 * Mercator, simplificados por Douglas–Peucker. Versionado de propósito: em
 * runtime o painel não busca mapa nenhum, só desenha estes paths.
 *
 * Para regerar: npm run mapa
 */

export const MAPA_LARGURA = ${LARGURA};
export const MAPA_ALTURA = ${altura};

export type ContornoUF = { uf: string; d: string };

export const CONTORNOS_UF: ContornoUF[] = [
`;

  const corpo = saida.map((e) => `  { uf: "${e.uf}", d: "${e.d}" },`).join("\n");
  const arquivo = `${cabecalho}${corpo}\n];\n`;

  await mkdir(dirname(DESTINO), { recursive: true });
  await writeFile(DESTINO, arquivo, "utf8");

  const kb = Math.round(Buffer.byteLength(arquivo) / 1024);
  console.log(`\nEscrito ${DESTINO}`);
  console.log(`  ${saida.length} estados, viewBox ${LARGURA}x${altura}, ${kb} KB`);
  if (saida.length !== 27) {
    console.warn(`  ! esperado 27 estados, saíram ${saida.length}`);
    process.exitCode = 1;
  }
}

main().catch((erro) => {
  console.error("Falhou:", erro.message);
  process.exit(1);
});
