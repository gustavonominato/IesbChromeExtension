#!/bin/bash

# ============================================================
# Script: build-dist.sh
# Objetivo:
#   - Ler a versão do manifest.json
#   - Criar a pasta dist caso não exista
#   - Gerar um ZIP da extensão
#   - Nomear o ZIP com a versão encontrada
#   - Ignorar a própria pasta dist e este script
#
# Exemplo de saída:
#   dist/1.0.17.zip
# ============================================================

set -e

MANIFEST_FILE="manifest.json"
DIST_DIR="dist"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Erro: manifest.json não encontrado."
    exit 1
fi

VERSION=$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$MANIFEST_FILE" \
    | sed -E 's/.*"([^"]+)"/\1/')

if [ -z "$VERSION" ]; then
    echo "Erro: não foi possível localizar a versão no manifest.json."
    exit 1
fi

mkdir -p "$DIST_DIR"

ZIP_FILE="${DIST_DIR}/${VERSION}.zip"

rm -f "$ZIP_FILE"

echo "Gerando build da versão: $VERSION"

zip -r "$ZIP_FILE" . \
    -x "./dist/*" \
    -x "./build-dist.sh" \
    -x "./.git/*" \
    -x "./.idea/*" \
    -x "./.DS_Store"

echo ""
echo "Build gerado com sucesso:"
echo "  $ZIP_FILE"
echo ""

ls -lh "$ZIP_FILE"