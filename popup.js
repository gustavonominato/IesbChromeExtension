const SITE_CAPTURA = "classroom.google.com";
const SITE_APLICACAO = "online.iesb.br";

document.addEventListener("DOMContentLoaded", async () => {
    const btnExecutar = document.getElementById("btnExecutar");
    const status = document.getElementById("status");

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tab || !tab.url) {
        status.innerText = "Não foi possível identificar a aba atual.";
        btnExecutar.disabled = true;
        return;
    }

    const url = new URL(tab.url);
    const hostname = url.hostname;

    const isSiteCaptura = hostname === SITE_CAPTURA;
    const isSiteAplicacao = hostname === SITE_APLICACAO;

    if (isSiteCaptura) {
        btnExecutar.innerText = "Capturar";
        status.innerText = "Google Classroom identificado.";
    } else if (isSiteAplicacao) {
        btnExecutar.innerText = "Aplicar";
        status.innerText = "IESB Online identificado.";
    } else {
        btnExecutar.innerText = "Indisponível";
        btnExecutar.disabled = true;
        status.innerText = "Esta página não está habilitada para uso da extensão.";
        return;
    }

    btnExecutar.addEventListener("click", () => {
        const action = isSiteCaptura ? "capturar" : "aplicar";

        chrome.tabs.sendMessage(tab.id, { action }, response => {
            if (chrome.runtime.lastError) {
                status.innerText = "Erro ao comunicar com a página. Recarregue a página e tente novamente.";
                return;
            }

            status.innerText = response?.message || "Ação executada.";
        });
    });
});