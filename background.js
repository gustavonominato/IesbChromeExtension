try {
    importScripts("jszip.min.js");
    console.log("[IESB Extension] JSZip carregado:", typeof JSZip);

    importScripts("xlsx.full.min.js");
    console.log("[IESB Extension] XLSX carregado:", typeof XLSX);

    importScripts("presenca-processor.js");
    console.log("[IESB Extension] Presença Processor carregado");
} catch (error) {
    console.error("[IESB Extension] Erro ao carregar scripts:", error);
}

console.log("[IESB Extension] background.js carregado");

chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === "capturar") {
        chrome.tabs.sendMessage(tab.id, { action: "capturar" });
    }

    if (info.menuItemId === "aplicar") {
        chrome.tabs.sendMessage(tab.id, { action: "aplicar" });
    }
});

chrome.downloads.onCreated.addListener(async downloadItem => {
    console.log("[IESB Extension] Download iniciado");
    console.log("[IESB Extension] Nome:", downloadItem.filename);
    console.log("[IESB Extension] URL:", downloadItem.url);

    const nomeArquivo = downloadItem.filename || "";
    const urlArquivo = downloadItem.url || "";

    try {
        console.log("[IESB Extension] Baixando ZIP em memória...");

        const response = await fetch(downloadItem.url, {
            credentials: "include"
        });

        const arrayBuffer = await response.arrayBuffer();

        console.log("[IESB Extension] ZIP carregado em memória");

        const zip = await JSZip.loadAsync(arrayBuffer);

        console.log("[IESB Extension] Arquivos Excel encontrados:");

        Object.keys(zip.files).forEach(caminhoArquivo => {
            const arquivo = zip.files[caminhoArquivo];

            if (arquivo.dir) return;

            const nomeMinusculo = caminhoArquivo.toLowerCase();

            if (
                nomeMinusculo.endsWith(".xlsx") ||
                nomeMinusculo.endsWith(".xls")
            ) {
                console.log(caminhoArquivo);
            }
        });

    } catch (error) {
        console.error("[IESB Extension] Erro ao processar ZIP:", error);
    }
});