/**
 * content.js
 *
 * Script injetado nas páginas habilitadas pela extensão.
 *
 * Responsabilidades principais:
 * - Receber mensagens enviadas pelo popup ou pelo menu de contexto.
 * - Roteiar a ação de captura para o fluxo de notas.
 * - Roteiar a ação de aplicação para o fluxo de presença/notas.
 * - Manter este arquivo simples, delegando regras específicas para módulos separados.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "capturar") {
            capturarValor(sendResponse);
            return true;
        }

        if (message.action === "aplicar") {
            aplicarDadosNoIesb(sendResponse);
            return true;
        }

        sendResponse({
            success: false,
            message: "Ação não reconhecida."
        });

        return true;
    } catch (error) {
        sendResponse({
            success: false,
            message: `Erro no content.js: ${error.message}`
        });

        return true;
    }
});