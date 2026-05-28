/**
 * background.js
 *
 * Service Worker da extensão Chrome.
 *
 * Responsabilidades principais:
 * - Carregar as bibliotecas locais e módulos da extensão.
 * - Criar os menus de contexto da extensão.
 * - Encaminhar mensagens do menu de contexto para as páginas habilitadas.
 * - Registrar o listener de downloads e delegar o processamento para o módulo de presença.
 * - Manter este arquivo como ponto central de configuração e orquestração do Service Worker.
 */
importScripts(
    "libs/jszip.min.js",
    "libs/xlsx.full.min.js",
    "utils/text-utils.js",
    "utils/date-utils.js",
    "modules/storage-service.js",
    "modules/presenca-processor.js",
    "modules/presenca-download-flow.js"
);

console.log("[IESB Extension] background.js carregado");

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "capturar",
            title: "Capturar notas",
            contexts: ["page"],
            documentUrlPatterns: [
                "https://online.iesb.br/*",
                "https://classroom.google.com/*",
                "https://drive.google.com/*"
            ]
        });

        chrome.contextMenus.create({
            id: "aplicar",
            title: "Aplicar notas",
            contexts: ["page"],
            documentUrlPatterns: [
                "https://online.iesb.br/*",
                "https://classroom.google.com/*",
                "https://drive.google.com/*"
            ]
        });
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === "capturar") {
        chrome.tabs.sendMessage(tab.id, { action: "capturar" });
    }

    if (info.menuItemId === "aplicar") {
        chrome.tabs.sendMessage(tab.id, { action: "aplicar" });
    }
});

chrome.downloads.onCreated.addListener(processarDownloadPresenca);