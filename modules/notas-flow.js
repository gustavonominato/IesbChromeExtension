/**
 * notas-flow.js
 *
 * Fluxo responsável pela captura e aplicação de notas.
 *
 * Responsabilidades principais:
 * - Capturar notas do Google Classroom.
 * - Consolidar valores capturados por aluno.
 * - Salvar os dados capturados em memória.
 * - Aplicar os totais no sistema Online IESB.
 * - Localizar alunos por nome normalizado.
 * - Preencher inputs de nota disparando eventos da página.
 */

function capturarValor(sendResponse) {
    const tbody = document.querySelector("tbody");

    if (!tbody) {
        sendResponse({
            success: false,
            message: "Nenhum <tbody> encontrado na página."
        });
        return;
    }

    const linhas = Array.from(tbody.querySelectorAll(":scope > tr"));

    if (linhas.length <= 1) {
        sendResponse({
            success: false,
            message: "Não há linhas suficientes no <tbody> para capturar."
        });
        return;
    }

    const linhasDeDados = linhas.slice(1);
    const quantidadeColunasNotas = calcularQuantidadeColunasNotas(linhasDeDados);
    const cabecalhosNotas = extrairCabecalhosNotas(tbody, quantidadeColunasNotas);

    const dadosExtraidos = linhasDeDados
        .map(tr => extrairDadosDaLinha(tr, cabecalhosNotas))
        .filter(linha => linha !== null);

    if (!dadosExtraidos.length) {
        sendResponse({
            success: false,
            message: "Nenhum dado válido foi extraído."
        });
        return;
    }

    const valorCapturado = dadosExtraidos
        .map(linha => linha.linhaOriginal)
        .join("\n");

    const notasCapturadas = {
        capturadoEm: new Date().toISOString(),
        cabecalhos: cabecalhosNotas,
        alunos: dadosExtraidos,
    };

    const linhasParaLog = dadosExtraidos.map(linha => ({
        aluno: linha.nome,
        notasExtraidas: linha.notas.map(nota => `${nota.cabecalho}: ${nota.valor}`).join("; "),
        linhaFinal: linha.linhaOriginal
    }));

    console.log("=== Dados extraídos do Classroom ===");
    console.log("[Notas Flow] Total de linhas extraídas:", dadosExtraidos.length);
    console.log("[Notas Flow] Cabeçalhos capturados:", cabecalhosNotas);
    console.log("[Notas Flow] Valor capturado bruto:", valorCapturado);
    console.log("[Notas Flow] Estrutura de notas capturadas:", notasCapturadas);
    console.log("[Notas Flow] Linhas extraídas:", linhasParaLog);
    console.table(linhasParaLog);

    chrome.storage.local.set({ valorCapturado, notasCapturadas }, () => {
        if (chrome.runtime.lastError) {
            console.error("[Notas Flow] Erro ao salvar valorCapturado:", chrome.runtime.lastError);
            sendResponse({
                success: false,
                message: `Erro ao salvar dados capturados: ${chrome.runtime.lastError.message}`
            });
            return;
        }

        chrome.storage.local.get(["valorCapturado", "notasCapturadas"], resultado => {
            console.log("[Notas Flow] valorCapturado salvo em memória:", resultado.valorCapturado);
            console.log("[Notas Flow] notasCapturadas salvo em memória:", resultado.notasCapturadas);

            sendResponse({
                success: true,
                message: `${dadosExtraidos.length} linhas capturadas com sucesso.`
            });
        });
    });
}

function calcularQuantidadeColunasNotas(linhasDeDados) {
    return linhasDeDados.reduce((maiorQuantidade, tr) => {
        const colunas = Array.from(tr.querySelectorAll("th, td")).slice(1);

        let ultimaColunaComNota = -1;

        colunas.forEach((coluna, index) => {
            const valorNota = extrairValorDaColuna(coluna);

            if (valorNota !== "") {
                ultimaColunaComNota = index;
            }
        });

        return Math.max(maiorQuantidade, ultimaColunaComNota + 1);
    }, 0);
}

function extrairCabecalhosNotas(tbody, quantidadeColunasNotas) {
    const cabecalhos = extrairCabecalhosDaTabela(tbody, quantidadeColunasNotas);
    const titulosAtividades = extrairTitulosAtividadesDaPagina();

    console.log("[Notas Flow] Quantidade de colunas identificadas:", quantidadeColunasNotas);
    console.log("[Notas Flow] Cabeçalhos da tabela:", cabecalhos);
    console.log("[Notas Flow] Títulos de atividades encontrados:", titulosAtividades);

    return Array.from({ length: quantidadeColunasNotas }).map((_, index) => {
        return (
            cabecalhos[index] ||
            titulosAtividades[index] ||
            `Nota ${index + 1}`
        );
    });
}

function extrairCabecalhosDaTabela(tbody, quantidadeColunasNotas) {
    const tabela = tbody.closest("table");

    if (!tabela) {
        return [];
    }

    const linhasCabecalho = Array.from(tabela.querySelectorAll("thead tr"));

    for (let linhaIndex = linhasCabecalho.length - 1; linhaIndex >= 0; linhaIndex--) {
        const colunas = Array.from(linhasCabecalho[linhaIndex].querySelectorAll("th, td"));
        const candidatos = colunas
            .slice(1)
            .map((coluna, index) => normalizarCabecalhoNota(extrairTextoCabecalhoDaColuna(coluna), index));

        if (candidatos.some(Boolean)) {
            return candidatos.slice(0, quantidadeColunasNotas);
        }
    }

    const colunasComRole = Array.from(tabela.querySelectorAll('[role="columnheader"]'));

    if (colunasComRole.length > 1) {
        const candidatos = colunasComRole
            .slice(1)
            .map((coluna, index) => normalizarCabecalhoNota(extrairTextoCabecalhoDaColuna(coluna), index));

        if (candidatos.some(Boolean)) {
            return candidatos.slice(0, quantidadeColunasNotas);
        }
    }

    return [];
}

function extrairTextoCabecalhoDaColuna(coluna) {
    if (!coluna) {
        return "";
    }

    return (
        coluna.getAttribute("aria-label") ||
        coluna.getAttribute("title") ||
        coluna.innerText ||
        ""
    );
}

function normalizarCabecalhoNota(texto, index) {
    const textoNormalizado = String(texto || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!textoNormalizado) {
        return "";
    }

    const matchAtividadeComAspas = textoNormalizado.match(/Atividade:\s*"([^"]+)"/i);

    if (matchAtividadeComAspas?.[1]) {
        return matchAtividadeComAspas[1].trim();
    }

    const matchAtividade = textoNormalizado.match(/Atividade:\s*(.+)$/i);

    if (matchAtividade?.[1]) {
        return limparTextoCabecalhoNota(matchAtividade[1]);
    }

    const matchNovaAtividade = textoNormalizado.match(/nova atividade:\s*(.+)$/i);

    if (matchNovaAtividade?.[1]) {
        return limparTextoCabecalhoNota(matchNovaAtividade[1]);
    }

    return limparTextoCabecalhoNota(textoNormalizado, index);
}

function limparTextoCabecalhoNota(texto, index) {
    const textoLimpo = String(texto || "")
        .replace(/\s+/g, " ")
        .replace(/^Atividade:\s*/i, "")
        .replace(/^"|"$/g, "")
        .replace(/^\d{1,2}\s+de\s+[a-zçãéíóú]+\.\s*/i, "")
        .replace(/^Sem\s+data\s+de\s+entrega\s*/i, "")
        .replace(/\s*more_vert.*$/i, "")
        .replace(/\s+de\s+\d+(?:[,.]\d+)?\s*$/i, "")
        .trim();

    if (!textoLimpo || ehTextoCabecalhoInvalido(textoLimpo)) {
        return "";
    }

    return textoLimpo;
}

function ehTextoCabecalhoInvalido(texto) {
    const textoNormalizado = String(texto || "").trim();

    return (
        textoNormalizado === "" ||
        ehNumero(textoNormalizado) ||
        textoNormalizado.toLowerCase() === "sem nota" ||
        textoNormalizado.toLowerCase() === "nota" ||
        /^nota\s*\d+$/i.test(textoNormalizado) ||
        textoNormalizado.toLowerCase().includes("editar a nota") ||
        textoNormalizado.toLowerCase().includes("carregando") ||
        textoNormalizado.toLowerCase().includes("mais opções")
    );
}

function extrairTitulosAtividadesDaPagina() {
    const textos = Array.from(document.querySelectorAll('[aria-label*="Atividade"], .jzdBjc'))
        .map(elemento => normalizarCabecalhoNota(
            elemento.getAttribute("aria-label") || elemento.innerText || "",
            0
        ))
        .filter(Boolean);

    return Array.from(new Set(textos));
}

function extrairDadosDaLinha(tr, cabecalhosNotas) {
    const colunas = Array.from(tr.querySelectorAll("th, td"));

    if (colunas.length <= 1) {
        return null;
    }

    const nomeAluno = extrairNomeAluno(colunas[0]);

    if (!nomeAluno) {
        return null;
    }

    const notas = colunas
        .slice(1)
        .map((coluna, index) => ({
            indice: index,
            cabecalho: cabecalhosNotas[index] || `Nota ${index + 1}`,
            valor: extrairValorDaColuna(coluna),
        }))
        .filter(nota => nota.valor !== "");

    if (!notas.length) {
        console.warn("[Notas Flow] Nenhuma nota encontrada para o aluno:", nomeAluno);
        return null;
    }

    return {
        nome: nomeAluno,
        notas,
        linhaOriginal: [
            nomeAluno,
            ...notas.map(nota => nota.valor)
        ].join(";")
    };
}


function extrairNomeAluno(colunaNome) {
    if (!colunaNome) {
        return "";
    }

    const linkNome = colunaNome.querySelector("a");

    if (linkNome?.innerText?.trim()) {
        return linkNome.innerText.trim();
    }

    return colunaNome.innerText?.trim() || "";
}

function converterParaNumero(valor) {
    if (!valor) {
        return 0;
    }

    const numero = String(valor)
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");

    if (!numero) {
        return 0;
    }

    const convertido = Number(numero);

    return Number.isFinite(convertido) ? convertido : 0;
}

function formatarNumero(valor) {
    if (Number.isInteger(valor)) {
        return String(valor);
    }

    return String(valor).replace(".", ",");
}

function extrairValorDaColuna(coluna) {
    if (!coluna) {
        return "";
    }

    const notaVisual = coluna.querySelector(".csHi5d");

    if (notaVisual) {
        const textoNota = Array.from(notaVisual.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .find(texto => texto && ehNumero(texto));

        if (textoNota) {
            return normalizarValor(textoNota);
        }
    }

    const ariaLabelNota = Array.from(coluna.querySelectorAll("[aria-label]"))
        .map(el => el.getAttribute("aria-label")?.trim())
        .find(label => label && /^\d+([.,]\d+)?\s+Editar a nota/i.test(label));

    if (ariaLabelNota) {
        const match = ariaLabelNota.match(/^(\d+([.,]\d+)?)/);

        if (match) {
            return normalizarValor(match[1]);
        }
    }

    const textoColuna = coluna.innerText?.trim() || "";

    if (deveIgnorarTexto(textoColuna)) {
        return "";
    }

    return "";
}

function ehNumero(valor) {
    return /^\d+([.,]\d+)?$/.test(String(valor).trim());
}

function deveIgnorarTexto(texto) {
    if (!texto) {
        return true;
    }

    const textoNormalizado = String(texto).trim();

    return (
        textoNormalizado === "" ||
        textoNormalizado.includes("Sem nota") ||
        textoNormalizado.includes("Carregando") ||
        textoNormalizado.includes("Carregando os detalhes do envio") ||
        textoNormalizado.includes("Mais opções") ||
        textoNormalizado.includes("Estigfend")
    );
}

function normalizarValor(valor) {
    return String(valor)
        .replace(/\s+/g, " ")
        .replace(/ de /g, "/")
        .replace(/\/\d+$/, "")
        .trim();
}

function aplicarValorNoPrimeiroInput(sendResponse) {
    chrome.storage.local.get(["valorCapturado", "notasCapturadas", "notasColunasSelecionadas"], result => {
        const valorCapturado = result.valorCapturado;
        const notasCapturadas = result.notasCapturadas;
        const notasColunasSelecionadas = result.notasColunasSelecionadas || [];

        if (!valorCapturado && !notasCapturadas) {
            sendResponse({
                success: false,
                message: "Nenhum valor capturado ainda."
            });
            return;
        }

        const registros = montarRegistrosParaAplicacaoNotas(
            valorCapturado,
            notasCapturadas,
            notasColunasSelecionadas
        );

        if (!registros.length) {
            sendResponse({
                success: false,
                message: "Nenhuma coluna de nota foi selecionada para aplicação."
            });
            return;
        }

        let aplicados = 0;
        const naoEncontrados = [];

        registros.forEach(registro => {
            const tr = localizarLinhaPorNome(registro.nome);

            if (!tr) {
                naoEncontrados.push(registro.nome);
                return;
            }
            const inputsEditaveis = Array.from(tr.querySelectorAll("input"))
                .filter(input => !input.disabled && input.type !== "hidden");

            const input = inputsEditaveis.find(input => String(input.value || "").trim() === "");

            if (!input) {
                naoEncontrados.push(`${registro.nome} - input em branco não encontrado`);
                return;
            }

            preencherInput(input, registro.total);
            aplicados++;
        });

        console.log("=== Aplicação de notas no IESB ===");
        console.log("Registros capturados:", registros);
        console.log("Aplicados:", aplicados);
        console.log("Não encontrados:", naoEncontrados);

        sendResponse({
            success: true,
            message: montarMensagemResultadoAplicacaoNotas(aplicados, naoEncontrados)
        });
    });
}

function montarRegistrosParaAplicacaoNotas(valorCapturado, notasCapturadas, notasColunasSelecionadas) {
    if (notasCapturadas?.alunos?.length) {
        if (!notasColunasSelecionadas.length) {
            console.warn("[Notas Flow] Nenhuma coluna selecionada para aplicação de notas.");
            return [];
        }

        return notasCapturadas.alunos.map(aluno => {
            const totalSelecionado = aluno.notas
                .filter(nota => notasColunasSelecionadas.includes(nota.indice))
                .reduce((soma, nota) => soma + converterParaNumero(nota.valor), 0);

            return {
                nome: aluno.nome,
                total: formatarNumero(totalSelecionado),
                notasExtraidas: aluno.notas.map(nota => nota.valor),
                notasSelecionadas: aluno.notas.filter(nota => notasColunasSelecionadas.includes(nota.indice)),
                linhaOriginal: aluno.linhaOriginal,
            };
        });
    }

    return String(valorCapturado || "")
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean)
        .map(linha => {
            const partes = linha.split(";");

            return {
                nome: partes[0],
                total: partes[partes.length - 1],
                notasExtraidas: partes.slice(1, -1),
                notasSelecionadas: [],
                linhaOriginal: linha,
            };
        });
}

function montarMensagemResultadoAplicacaoNotas(aplicados, naoEncontrados) {
    let mensagem = `Aplicados: ${aplicados}. Não encontrados: ${naoEncontrados.length}.`;

    if (naoEncontrados.length > 0) {
        mensagem += "\n\nNão encontrados:";

        naoEncontrados.forEach(item => {
            mensagem += `\n- ${item}`;
        });
    }

    return mensagem;
}

function localizarLinhaPorNome(nomeCapturado) {
    const nomeNormalizado = normalizarNome(nomeCapturado);

    const linhas = Array.from(document.querySelectorAll("tbody tr"));

    return linhas.find(tr => {
        const primeiraColuna = tr.querySelector("td:first-child");

        if (!primeiraColuna) {
            return false;
        }

        const textoLinha = normalizarNome(primeiraColuna.innerText);

        return textoLinha.includes(nomeNormalizado) || nomeNormalizado.includes(textoLinha);
    });
}

function preencherInput(input, valor) {
    input.focus();

    input.value = valor;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    if (typeof input.onchange === "function") {
        input.onchange();
    }

    input.blur();
}