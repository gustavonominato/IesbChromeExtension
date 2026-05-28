

/**
 * presenca-aplicacao-flow.js
 *
 * Fluxo responsável pela aplicação automática de faltas no Online IESB.
 *
 * Responsabilidades principais:
 * - Identificar a data da aula exibida na tela.
 * - Ler os dados de presença já processados em memória.
 * - Comparar os alunos da página com o consolidado processado.
 * - Marcar falta para alunos ausentes.
 * - Desmarcar falta para alunos presentes.
 * - Exibir resumo final da aplicação.
 */

function aplicarDadosNoIesb(sendResponse) {
    chrome.storage.local.get(["presencaConsolidadoPorAluno", "valorCapturado"], result => {
        if (result.presencaConsolidadoPorAluno) {
            aplicarPresencasNoIesb(result.presencaConsolidadoPorAluno, sendResponse);
            return;
        }

        aplicarValorNoPrimeiroInput(sendResponse);
    });
}

function aplicarPresencasNoIesb(presencaConsolidadoPorAluno, sendResponse) {
    const dataTela = identificarDataDaAulaNaTela();

    console.log("[IESB Presença] Data identificada na tela:", dataTela);
    console.log("[IESB Presença] Dados disponíveis em memória:", presencaConsolidadoPorAluno);

    if (!dataTela) {
        alert("Não foi possível identificar a data da aula nesta página.");

        sendResponse({
            success: false,
            message: "Não foi possível identificar a data da aula nesta página."
        });

        return;
    }

    const dadosDaData = filtrarDadosPresencaPorData(
        presencaConsolidadoPorAluno,
        dataTela
    );

    if (!dadosDaData.temDados) {
        alert(
            `Não possuímos dados da aula ${formatarDataIsoParaBr(dataTela)} para aplicar.`
        );

        sendResponse({
            success: false,
            message: `Não possuímos dados da aula ${formatarDataIsoParaBr(dataTela)} para aplicar.`
        });

        return;
    }

    const linhasAlunos = obterLinhasAlunosFrequencia();

    let manipulados = 0;
    let presentes = 0;
    let ausentes = 0;

    const naoEncontradosNaMemoria = [];
    const semCheckboxFalta = [];

    linhasAlunos.forEach(tr => {
        const dadosLinha = extrairDadosLinhaFrequencia(tr);

        if (!dadosLinha.nomeAluno || !dadosLinha.checkboxFalta) {
            if (dadosLinha.nomeAluno && !dadosLinha.checkboxFalta) {
                semCheckboxFalta.push(dadosLinha.nomeAluno);
            }

            return;
        }

        const alunoMemoria = dadosDaData.mapaPorNome.get(
            normalizarNome(dadosLinha.nomeAluno)
        );

        const estaPresente = alunoMemoria?.presente === true;

        if (!alunoMemoria) {
            naoEncontradosNaMemoria.push(dadosLinha.nomeAluno);
        }

        aplicarEstadoCheckboxFalta(
            dadosLinha.checkboxFalta,
            !estaPresente
        );

        manipulados++;

        if (estaPresente) {
            presentes++;
        } else {
            ausentes++;
        }
    });

    console.log("[IESB Presença] Resultado da aplicação:", {
        dataTela,
        manipulados,
        presentes,
        ausentes,
        naoEncontradosNaMemoria,
        semCheckboxFalta,
    });

    alert(
        `Aplicação concluída para ${formatarDataIsoParaBr(dataTela)}.\n\n` +
        `Alunos manipulados: ${manipulados}\n` +
        `Presentes: ${presentes}\n` +
        `Ausentes: ${ausentes}`
    );

    sendResponse({
        success: true,
        message: `Manipulados: ${manipulados}. Presentes: ${presentes}. Ausentes: ${ausentes}.`
    });
}

function identificarDataDaAulaNaTela() {
    const ths = Array.from(document.querySelectorAll("th"));

    for (const th of ths) {
        const texto = String(th.innerText || "").trim();
        const dataIso = extrairPrimeiraDataIsoDoTexto(texto);

        if (dataIso) {
            return dataIso;
        }
    }

    return extrairPrimeiraDataIsoDoTexto(document.body?.innerText || "");
}

function filtrarDadosPresencaPorData(presencaConsolidadoPorAluno, dataTela) {
    const alunos = presencaConsolidadoPorAluno.consolidadoParaAplicacao || [];
    const datasAulas = presencaConsolidadoPorAluno.datasAulas || [];

    const temDados = datasAulas.includes(dataTela);
    const mapaPorNome = new Map();

    if (!temDados) {
        return {
            temDados: false,
            mapaPorNome,
        };
    }

    alunos.forEach(aluno => {
        const nomeNormalizado = normalizarNome(
            aluno.nomeCompleto ||
            `${aluno.nome || ""} ${aluno.sobrenome || ""}`
        );

        if (!nomeNormalizado) {
            return;
        }

        mapaPorNome.set(nomeNormalizado, {
            aluno,
            presente: aluno.presencasPorData?.[dataTela] === 1,
        });
    });

    return {
        temDados: true,
        mapaPorNome,
    };
}

function obterLinhasAlunosFrequencia() {
    return Array.from(document.querySelectorAll("tr.tr01"));
}

function extrairDadosLinhaFrequencia(tr) {
    const checkboxFalta = Array.from(
        tr.querySelectorAll('input[type="checkbox"]')
    ).find(input => String(input.name || "").startsWith("Falta"));

    const colunas = Array.from(tr.querySelectorAll("td"));

    const matricula = colunas[0]?.innerText?.trim() || "";

    let nomeAluno = "";

    if (colunas[1]) {
        const linkNome = colunas[1].querySelector("a");

        nomeAluno = (
            linkNome?.innerText ||
            colunas[1].innerText ||
            ""
        ).trim();

        nomeAluno = removerSufixoMatriculado(nomeAluno);
    }

    return {
        tr,
        matricula,
        nomeAluno,
        checkboxFalta,
    };
}

function aplicarEstadoCheckboxFalta(checkbox, deveMarcarFalta) {
    if (!checkbox) {
        return;
    }

    if (checkbox.checked === deveMarcarFalta) {
        return;
    }

    checkbox.click();

    checkbox.dispatchEvent(new Event("input", { bubbles: true }));
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
}