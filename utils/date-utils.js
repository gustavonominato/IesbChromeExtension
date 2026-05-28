

/**
 * date-utils.js
 *
 * Funções utilitárias para conversão e formatação de datas.
 *
 * Responsabilidades principais:
 * - Converter datas do formato brasileiro para ISO.
 * - Converter datas ISO para o formato brasileiro.
 * - Extrair datas de textos da página do IESB.
 * - Padronizar datas para comparação entre planilhas e telas do sistema.
 */

function converterDataBrParaIso(dataBr) {
    if (!dataBr) return '';

    const match = String(dataBr).match(/(\d{2})\/(\d{2})\/(\d{4})/);

    if (!match) {
        return '';
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
}

function formatarDataIsoParaBr(dataIso) {
    if (!dataIso) return '';

    const partes = String(dataIso).split('-');

    if (partes.length !== 3) {
        return dataIso;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function extrairPrimeiraDataBrDoTexto(texto) {
    const match = String(texto || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? match[0] : '';
}

function extrairPrimeiraDataIsoDoTexto(texto) {
    const dataBr = extrairPrimeiraDataBrDoTexto(texto);
    return converterDataBrParaIso(dataBr);
}

function extrairDataIsoDoNome(nome) {
    const match = String(nome || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
}