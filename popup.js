const SITE_CAPTURA = "classroom.google.com";
const SITE_APLICACAO = "online.iesb.br";
const SITE_DRIVE = "drive.google.com";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[IESB Popup] DOMContentLoaded iniciado");

    const btnExecutar = document.getElementById("btnExecutar");
    const status = document.getElementById("status");

    const downloadPresencaProcessado = await carregarResumoPresencaProcessada();

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    console.log("[IESB Popup] Aba atual:", tab);

    if (!tab || !tab.url) {
        status.innerText = "Não foi possível identificar a aba atual.";
        btnExecutar.disabled = true;
        return;
    }

    const url = new URL(tab.url);
    const hostname = url.hostname;

    const isSiteCaptura = hostname === SITE_CAPTURA;
    const isSiteAplicacao = hostname === SITE_APLICACAO;
    const isSiteDrive = hostname === SITE_DRIVE;

    if (isSiteCaptura) {
        btnExecutar.innerText = "Capturar";
        status.innerText = "Google Classroom identificado.";
    } else if (isSiteAplicacao) {
        btnExecutar.innerText = "Aplicar";
        status.innerText = "IESB Online identificado.";
    } else if (isSiteDrive) {
        if (downloadPresencaProcessado) {
            marcarDownloadComoProcessado();
        } else {
            btnExecutar.innerText = "Aguardando download";
            btnExecutar.disabled = true;
            btnExecutar.classList.remove("download-processado");
            status.innerText = "Google Drive identificado. Baixe o arquivo de presença para processar.";
        }
        return;
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

async function carregarResumoPresencaProcessada() {
    const resumoPresenca = document.getElementById("resumoPresenca");
    const totalArquivosProcessados = document.getElementById("totalArquivosProcessados");
    const totalAlunosProcessados = document.getElementById("totalAlunosProcessados");
    const listaAulasProcessadas = document.getElementById("listaAulasProcessadas");

    if (!resumoPresenca || !totalArquivosProcessados || !totalAlunosProcessados || !listaAulasProcessadas) {
        console.warn("[IESB Popup] Elementos do resumo não encontrados no popup.html");
        return false;
    }

    try {
        const { presencaConsolidadoPorAluno } = await chrome.storage.local.get("presencaConsolidadoPorAluno");

        console.log("[IESB Popup] Consolidado carregado da memória:", presencaConsolidadoPorAluno);

        if (!presencaConsolidadoPorAluno) {
            resumoPresenca.style.display = "none";
            return false;
        }

        totalArquivosProcessados.innerText = presencaConsolidadoPorAluno.totalArquivosProcessados ?? 0;
        totalAlunosProcessados.innerText = presencaConsolidadoPorAluno.totalAlunos ?? 0;
        preencherListaAulasProcessadas(listaAulasProcessadas, presencaConsolidadoPorAluno);
        marcarDownloadComoProcessado();

        console.log("[IESB Popup] Consolidado para aplicação:");
        console.table((presencaConsolidadoPorAluno.consolidadoParaAplicacao || []).map(aluno => ({
            nomeCompleto: aluno.nomeCompleto,
            presencas: aluno.presencas,
            faltas: aluno.faltas,
            faltasPonderadas: aluno.faltasPonderadas,
            totalAulas: aluno.totalAulas,
        })));

        resumoPresenca.style.display = "block";
        return true;
    } catch (error) {
        console.error("[IESB Popup] Erro ao carregar resumo de presença:", error);
        resumoPresenca.style.display = "none";
        return false;
    }
}

function marcarDownloadComoProcessado() {
    const btnExecutar = document.getElementById("btnExecutar");
    const status = document.getElementById("status");

    if (!btnExecutar || !status) return;

    btnExecutar.innerText = "Download processado";
    btnExecutar.disabled = true;
    btnExecutar.classList.add("download-processado");
    status.innerText = "Download interceptado e processado com sucesso.";
}

function preencherListaAulasProcessadas(container, presencaConsolidadoPorAluno) {
    container.innerHTML = "";

    const aulas = calcularResumoPorData(presencaConsolidadoPorAluno);

    if (!aulas.length) {
        container.innerHTML = "<div class='linha-aula-processada'>Nenhuma aula identificada.</div>";
        return;
    }

    aulas.forEach(aula => {
        const div = document.createElement("div");
        div.className = "linha-aula-processada";
        div.innerText = `${aula.data}, ${aula.presencas} presenças, ${aula.faltas} faltas`;
        container.appendChild(div);
    });
}

function calcularResumoPorData(presencaConsolidadoPorAluno) {
    const datasAulas = presencaConsolidadoPorAluno?.datasAulas || [];
    const consolidadoParaAplicacao = presencaConsolidadoPorAluno?.consolidadoParaAplicacao || [];

    return datasAulas.map(data => {
        let presencas = 0;
        let faltas = 0;

        consolidadoParaAplicacao.forEach(aluno => {
            const presente = aluno.presencasPorData?.[data] === 1;

            if (presente) {
                presencas++;
            } else {
                faltas++;
            }
        });

        return {
            data: formatarDataPopup(data),
            presencas,
            faltas,
        };
    });
}

function formatarDataPopup(dataIso) {
    if (!dataIso) return "";

    const partes = dataIso.split("-");

    if (partes.length !== 3) {
        return dataIso;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}