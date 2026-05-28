

/**
 * text-utils.js
 *
 * Funções utilitárias para normalização e comparação de textos.
 *
 * Responsabilidades principais:
 * - Remover acentos e diferenças de caixa alta/baixa.
 * - Normalizar espaços em branco.
 * - Padronizar nomes de alunos para comparação entre planilhas e páginas HTML.
 * - Facilitar a localização de alunos mesmo com pequenas diferenças de formatação.
 */

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizarNome(nome) {
    return normalizarTexto(nome)
        .replace(/\s*-\s*matriculado\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function removerSufixoMatriculado(texto) {
    return String(texto || '')
        .replace(/\s*-\s*Matriculado\s*/i, '')
        .trim();
}

function textoPossuiConteudo(texto) {
    return normalizarTexto(texto).length > 0;
}