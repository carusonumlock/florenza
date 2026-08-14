#!/usr/bin/env python3
"""
Importador das fotos de anéis de formatura.

Lê os PNGs originais de `aneisFormatura/` — cujo nome carrega o código de
produto e o preço, no formato `CODIGO_R$PRECO.png` (ex.: `3187_R$2420.png`) —
e gera as imagens que o site realmente serve, em `produtos/formatura/`:

    3187.webp      960px de largura  (card em telas retina / futura ampliação)
    3187-sm.webp   480px de largura  (card em telas comuns)

Os originais têm ~2,4 MB cada e ficariam com 38 MB só na grade da categoria.
As versões WebP ficam em ~5% disso e preservam o canal alpha, então o anel
continua recortado sobre o marfim do site.

Cada foto também é aparada pela caixa do recorte (o PNG vem com muita margem
transparente em volta do anel). Sem isso, cada anel apareceria num tamanho
diferente dentro do card.

Uso:
    python tools/importar-aneis-formatura.py

O script é idempotente: rodar de novo só regrava as saídas. Ao receber fotos
novas, jogue na pasta de origem e rode outra vez — ele avisa quais códigos
ainda não têm ficha em js/data/aneis-formatura.js.
"""

import os
import re
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEM = os.path.join(RAIZ, "aneisFormatura")
DESTINO = os.path.join(RAIZ, "produtos", "formatura")
FICHAS = os.path.join(RAIZ, "js", "data", "aneis-formatura.js")

# `3187_R$2420.png` -> código 3187, preço R$ 2.420,00
NOME = re.compile(r"^(\d+)_R\$(\d+)\.(png|jpg|jpeg|webp)$", re.IGNORECASE)

LARGURAS = {"": 960, "-sm": 480}
QUALIDADE = 82
# Margem que sobra em volta do anel depois de aparar, em % do lado maior.
FOLGA = 0.02
# Abaixo disso o pixel é fundo, não peça. O recorte dos originais é quase
# binário (39% em alpha 0, 57% em alpha ~253), então o limiar é folgado.
LIMIAR_ALPHA = 8


def aparar(im):
    """Corta a moldura transparente em volta do anel e devolve com folga."""
    alpha = im.getchannel("A").point(lambda a: 255 if a > LIMIAR_ALPHA else 0)
    caixa = alpha.getbbox()
    if not caixa:
        return im
    folga = int(max(im.size) * FOLGA)
    esq, topo, dir_, base = caixa
    return im.crop(
        (
            max(0, esq - folga),
            max(0, topo - folga),
            min(im.width, dir_ + folga),
            min(im.height, base + folga),
        )
    )


def main():
    if not os.path.isdir(ORIGEM):
        sys.exit(f"Pasta de origem não encontrada: {ORIGEM}")

    os.makedirs(DESTINO, exist_ok=True)

    arquivos = sorted(os.listdir(ORIGEM))
    ignorados = [f for f in arquivos if not NOME.match(f)]
    encontrados = []

    for arquivo in arquivos:
        casa = NOME.match(arquivo)
        if not casa:
            continue

        sku, preco = casa.group(1), int(casa.group(2))
        encontrados.append((sku, preco))

        original = Image.open(os.path.join(ORIGEM, arquivo)).convert("RGBA")
        recortado = aparar(original)

        for sufixo, largura in LARGURAS.items():
            escala = largura / recortado.width
            saida = recortado.resize(
                (largura, max(1, round(recortado.height * escala))), Image.LANCZOS
            )
            caminho = os.path.join(DESTINO, f"{sku}{sufixo}.webp")
            saida.save(caminho, "WEBP", quality=QUALIDADE, method=6)

        peso = os.path.getsize(os.path.join(DESTINO, f"{sku}.webp")) / 1024
        print(
            f"{sku}  R$ {preco:>6,}".replace(",", ".")
            + f"  {original.size[0]}x{original.size[1]} -> {recortado.size[0]}x{recortado.size[1]}"
            f"  ({peso:.0f} KB)"
        )

    print(f"\n{len(encontrados)} peça(s) em {os.path.relpath(DESTINO, RAIZ)}")

    if ignorados:
        print("\nFora do padrão CODIGO_R$PRECO — não importados:")
        for arquivo in ignorados:
            print(f"  - {arquivo}")

    # Guarda-corpo: preço do nome do arquivo é a fonte de verdade da logística.
    # Se a ficha do site divergir, o erro passaria despercebido na vitrine.
    if os.path.isfile(FICHAS):
        ficha = open(FICHAS, encoding="utf-8").read()
        sem_ficha, divergentes = [], []
        for sku, preco in encontrados:
            bloco = re.search(
                r'sku:\s*"%s".*?precoCentavos:\s*(\d+)' % sku, ficha, re.S
            )
            if not bloco:
                sem_ficha.append(sku)
            elif int(bloco.group(1)) != preco * 100:
                divergentes.append((sku, preco * 100, int(bloco.group(1))))

        if sem_ficha:
            print("\nSem ficha em js/data/aneis-formatura.js (não aparecem no site):")
            for sku in sem_ficha:
                print(f"  - {sku}")
        if divergentes:
            print("\nPreço do arquivo diferente do preço da ficha:")
            for sku, arquivo_c, ficha_c in divergentes:
                print(f"  - {sku}: arquivo {arquivo_c} vs ficha {ficha_c} (centavos)")
        if not sem_ficha and not divergentes:
            print("Fichas conferem com os arquivos.")


if __name__ == "__main__":
    main()
