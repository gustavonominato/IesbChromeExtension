importScripts(
    "jszip.min.js",
    "xlsx.full.min.js",
    "presenca-processor.js"
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

chrome.downloads.onCreated.addListener(async downloadItem => {
    console.log("[IESB Extension] Download iniciado:", downloadItem);

    try {
        const response = await fetch(downloadItem.url, {
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP ao baixar arquivo: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        console.log("[IESB Extension] Arquivo carregado em memória. Bytes:", arrayBuffer.byteLength);

        try {
            await processarComoZip(arrayBuffer);
            return;
        } catch (zipError) {
            console.warn("[IESB Extension] Não foi possível processar como ZIP. Tentando como Excel direto...");
            console.warn(zipError);
        }

        await processarComoExcelDireto(downloadItem, arrayBuffer);
    } catch (error) {
        console.error("[IESB Extension] Erro ao processar download:", error);
    }
});

async function processarComoZip(arrayBuffer) {
    console.log("[IESB Extension] Tentando processar como ZIP...");

    const zip = await JSZip.loadAsync(arrayBuffer);
    const arquivosExcel = [];

    for (const caminhoArquivo of Object.keys(zip.files)) {
        const arquivoZip = zip.files[caminhoArquivo];

        if (arquivoZip.dir) continue;

        const nomeMinusculo = caminhoArquivo.toLowerCase();

        if (!nomeMinusculo.endsWith(".xlsx") && !nomeMinusculo.endsWith(".xls")) {
            continue;
        }

        const arrayBufferExcel = await arquivoZip.async("arraybuffer");

        arquivosExcel.push(
            criarArquivoPresenca(
                caminhoArquivo.split("/").pop(),
                caminhoArquivo,
                arrayBufferExcel
            )
        );
    }

    console.log("[IESB Extension] Total de arquivos Excel encontrados no ZIP:", arquivosExcel.length);
    console.table(arquivosExcel.map(arquivo => ({
        nome: arquivo.nome,
        caminho: arquivo.caminho,
        tamanhoBytes: arquivo.arrayBuffer.byteLength
    })));

    if (arquivosExcel.length === 0) {
        console.warn("[IESB Extension] ZIP processado, mas nenhum Excel foi encontrado.");
        return;
    }

    const resultadoPresenca = await processarArquivosPresenca(arquivosExcel);
    imprimirResultadoPresenca(resultadoPresenca);
}

async function processarComoExcelDireto(downloadItem, arrayBuffer) {
    const nomeArquivo = downloadItem.filename || obterNomeArquivoPelaUrl(downloadItem.url) || "arquivo.xlsx";

    console.log("[IESB Extension] Processando como Excel direto:", nomeArquivo);

    const resultadoPresenca = await processarArquivosPresenca([
        criarArquivoPresenca(
            nomeArquivo,
            nomeArquivo,
            arrayBuffer
        )
    ]);

    imprimirResultadoPresenca(resultadoPresenca);
}

function imprimirResultadoPresenca(resultadoPresenca) {
    console.log("[IESB Extension] Resultado completo do processamento de presença:", resultadoPresenca);

    console.log("[IESB Extension] Resumo do processamento de presença:", {
        totalArquivosProcessados: resultadoPresenca?.totalArquivosProcessados,
        totalRegistros: resultadoPresenca?.totalRegistros,
        totalAlunos: resultadoPresenca?.totalAlunos,
        totalAulas: resultadoPresenca?.totalAulas,
        datasAulas: resultadoPresenca?.datasAulas,
        processadoEm: resultadoPresenca?.processadoEm,
    });

    console.log("[IESB Extension] Consolidado para aplicação:");
    console.table((resultadoPresenca?.consolidadoParaAplicacao || []).map(aluno => ({
        nomeCompleto: aluno.nomeCompleto,
        presencas: aluno.presencas,
        faltas: aluno.faltas,
        faltasPonderadas: aluno.faltasPonderadas,
        totalAulas: aluno.totalAulas,
    })));
}

function obterNomeArquivoPelaUrl(url) {
    if (!url) return "";

    try {
        const urlObj = new URL(url);
        const partes = urlObj.pathname.split("/");
        return decodeURIComponent(partes.pop() || "");
    } catch (error) {
        console.warn("[IESB Extension] Não foi possível extrair nome do arquivo pela URL:", error);
        return "";
    }
}