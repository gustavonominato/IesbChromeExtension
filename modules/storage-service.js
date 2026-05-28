

/**
 * storage-service.js
 *
 * Camada centralizada para acesso ao chrome.storage.local.
 *
 * Responsabilidades principais:
 * - Salvar dados processados de presença.
 * - Recuperar dados consolidados da memória.
 * - Limpar dados salvos.
 * - Evitar duplicação de chamadas diretas ao chrome.storage.
 * - Centralizar as chaves utilizadas pela extensão.
 */

const STORAGE_KEYS = {
    PRESENCA_CONSOLIDADO: 'presencaConsolidadoPorAluno',
    VALOR_CAPTURADO: 'valorCapturado',
};

async function salvarConsolidadoPresenca(presencaConsolidadoPorAluno) {
    await chrome.storage.local.set({
        [STORAGE_KEYS.PRESENCA_CONSOLIDADO]: presencaConsolidadoPorAluno,
    });

    console.log('[Storage Service] Presença consolidada salva com sucesso');
}

async function buscarConsolidadoPresenca() {
    const resultado = await chrome.storage.local.get(
        STORAGE_KEYS.PRESENCA_CONSOLIDADO
    );

    return resultado[STORAGE_KEYS.PRESENCA_CONSOLIDADO] || null;
}

async function limparConsolidadoPresenca() {
    await chrome.storage.local.remove(
        STORAGE_KEYS.PRESENCA_CONSOLIDADO
    );

    console.log('[Storage Service] Presença consolidada removida');
}

async function salvarValorCapturado(valorCapturado) {
    await chrome.storage.local.set({
        [STORAGE_KEYS.VALOR_CAPTURADO]: valorCapturado,
    });

    console.log('[Storage Service] Valor capturado salvo com sucesso');
}

async function buscarValorCapturado() {
    const resultado = await chrome.storage.local.get(
        STORAGE_KEYS.VALOR_CAPTURADO
    );

    return resultado[STORAGE_KEYS.VALOR_CAPTURADO] || null;
}

async function limparValorCapturado() {
    await chrome.storage.local.remove(
        STORAGE_KEYS.VALOR_CAPTURADO
    );

    console.log('[Storage Service] Valor capturado removido');
}