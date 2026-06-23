/**
 * popup.js
 *
 * Script responsável pelo comportamento do popup da extensão.
 *
 * Responsabilidades principais:
 * - Identificar em qual site o usuário está: Google Classroom, IESB Online ou Google Drive.
 * - Controlar o texto, estado e visibilidade do botão principal do popup.
 * - Exibir o status atual da extensão para o usuário.
 * - Ler da memória os dados de presença já processados.
 * - Exibir o resumo do processamento no popup.
 * - Mostrar ou esconder o botão de relatório completo conforme existam dados em memória.
 * - Abrir a página interna relatorio.html com o detalhamento dos dados processados.
 */
const SITE_CAPTURA = "classroom.google.com";
const SITE_APLICACAO = "online.iesb.br";
const SITE_DRIVE = "drive.google.com";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("[IESB Popup] DOMContentLoaded iniciado");

    const btnExecutar = document.getElementById("btnExecutar");
    const status = document.getElementById("status");

    configurarBotaoRelatorio();

    const downloadPresencaProcessado = await carregarResumoPresencaProcessada();
    const notasCapturadasEmMemoria = await verificarNotasCapturadasEmMemoria();
    const existemDadosParaAplicar = downloadPresencaProcessado || notasCapturadasEmMemoria.possuiNotas;

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
        esconderSelecaoColunasNotas();
        btnExecutar.innerText = "Capturar";
        status.innerText = "Google Classroom identificado.";
    } else if (isSiteAplicacao) {
        if (!existemDadosParaAplicar) {
            btnExecutar.style.display = "none";
            btnExecutar.disabled = true;
            status.innerText = "IESB Online identificado. Não há dados em memória para aplicar.";
            return;
        }

        btnExecutar.style.display = "block";
        btnExecutar.innerText = "Aplicar";
        btnExecutar.disabled = false;
        btnExecutar.classList.remove("download-processado");
        renderizarSelecaoColunasNotas(notasCapturadasEmMemoria);

        if (downloadPresencaProcessado && notasCapturadasEmMemoria.possuiNotas) {
            status.innerText = `IESB Online identificado. Há dados de presença e notas de ${notasCapturadasEmMemoria.totalAlunos} alunos em memória para aplicar.`;
        } else if (downloadPresencaProcessado) {
            status.innerText = "IESB Online identificado. Há dados de presença em memória para aplicar.";
        } else {
            status.innerText = `IESB Online identificado. Há notas de ${notasCapturadasEmMemoria.totalAlunos} alunos em memória para aplicar.`;
        }
    } else if (isSiteDrive) {
        esconderSelecaoColunasNotas();
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
        esconderSelecaoColunasNotas();
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

        const btnVerRelatorio = document.getElementById("btnVerRelatorio");
        if (btnVerRelatorio)
            btnVerRelatorio.style.display = "block";

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

function configurarBotaoRelatorio() {
    const btnVerRelatorio = document.getElementById("btnVerRelatorio");

    if (!btnVerRelatorio) {
        console.warn("[IESB Popup] Botão btnVerRelatorio não encontrado no popup.html");
        return;
    }
    btnVerRelatorio.style.display = "none";

    btnVerRelatorio.addEventListener("click", () => {
        console.log("[IESB Popup] Abrindo relatório completo de presença");

        chrome.tabs.create({
            url: chrome.runtime.getURL("relatorio.html")
        });
    });
}

async function verificarNotasCapturadasEmMemoria() {
    try {
        const { valorCapturado, notasCapturadas, notasColunasSelecionadas } = await chrome.storage.local.get([
            "valorCapturado",
            "notasCapturadas",
            "notasColunasSelecionadas"
        ]);

        const linhasLegadas = typeof valorCapturado === "string"
            ? valorCapturado.split("\n").map(linha => linha.trim()).filter(Boolean)
            : [];

        const cabecalhos = Array.isArray(notasCapturadas?.cabecalhos)
            ? notasCapturadas.cabecalhos
            : [];

        const alunos = Array.isArray(notasCapturadas?.alunos)
            ? notasCapturadas.alunos
            : [];

        const resultado = {
            possuiNotas: alunos.length > 0 || linhasLegadas.length > 0,
            totalAlunos: alunos.length || linhasLegadas.length,
            totalColunas: cabecalhos.length,
            cabecalhos,
            colunasSelecionadas: Array.isArray(notasColunasSelecionadas) ? notasColunasSelecionadas : [],
            tamanho: valorCapturado?.length || 0,
            possuiEstruturaNova: alunos.length > 0,
        };

        console.log("[IESB Popup] Notas capturadas em memória:", resultado);

        return resultado;
    } catch (error) {
        console.error("[IESB Popup] Erro ao verificar notas capturadas em memória:", error);
        return {
            possuiNotas: false,
            totalAlunos: 0,
            totalColunas: 0,
            cabecalhos: [],
            colunasSelecionadas: [],
            tamanho: 0,
            possuiEstruturaNova: false,
        };
    }
}

function renderizarSelecaoColunasNotas(notasCapturadasEmMemoria) {
    const selecaoNotas = document.getElementById("selecaoNotas");
    const listaColunasNotas = document.getElementById("listaColunasNotas");

    if (!selecaoNotas || !listaColunasNotas) {
        console.warn("[IESB Popup] Elementos de seleção de notas não encontrados no popup.html");
        return;
    }

    listaColunasNotas.innerHTML = "";

    if (!notasCapturadasEmMemoria.possuiNotas || !notasCapturadasEmMemoria.cabecalhos.length) {
        selecaoNotas.style.display = "none";
        return;
    }

    notasCapturadasEmMemoria.cabecalhos.forEach((cabecalho, indice) => {
        const checkboxId = `colunaNota_${indice}`;
        const linha = document.createElement("div");
        linha.className = "linha-coluna-nota";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = checkboxId;
        checkbox.value = String(indice);
        checkbox.checked = notasCapturadasEmMemoria.colunasSelecionadas.includes(indice);

        checkbox.addEventListener("change", salvarColunasNotasSelecionadas);

        const label = document.createElement("label");
        label.htmlFor = checkboxId;
        label.innerText = cabecalho || `Nota ${indice + 1}`;

        linha.appendChild(checkbox);
        linha.appendChild(label);
        listaColunasNotas.appendChild(linha);
    });

    selecaoNotas.style.display = "block";
}

function esconderSelecaoColunasNotas() {
    const selecaoNotas = document.getElementById("selecaoNotas");
    const listaColunasNotas = document.getElementById("listaColunasNotas");

    if (listaColunasNotas) {
        listaColunasNotas.innerHTML = "";
    }

    if (selecaoNotas) {
        selecaoNotas.style.display = "none";
    }
}

async function salvarColunasNotasSelecionadas() {
    const checkboxes = Array.from(document.querySelectorAll("#listaColunasNotas input[type='checkbox']"));
    const notasColunasSelecionadas = checkboxes
        .filter(checkbox => checkbox.checked)
        .map(checkbox => Number(checkbox.value));

    await chrome.storage.local.set({ notasColunasSelecionadas });

    console.log("[IESB Popup] Colunas de notas selecionadas:", notasColunasSelecionadas);
}