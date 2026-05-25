chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "capturar",
        title: "Capturar notas",
        contexts: ["page"],
        documentUrlPatterns: ["https://online.iesb.br/*", "https://classroom.google.com/*"]
    });

    chrome.contextMenus.create({
        id: "aplicar",
        title: "Aplicar notas",
        contexts: ["page"],
        documentUrlPatterns: ["https://online.iesb.br/*", "https://classroom.google.com/*"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab.id) return;

    if (info.menuItemId === "capturar") {
        chrome.tabs.sendMessage(tab.id, {
            action: "capturar"
        });
    }

    if (info.menuItemId === "aplicar") {
        chrome.tabs.sendMessage(tab.id, {
            action: "aplicar"
        });
    }
});