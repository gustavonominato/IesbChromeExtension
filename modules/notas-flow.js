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

    const dadosExtraidos = linhasDeDados
        .map(extrairDadosDaLinha)
        .filter(linha => linha !== null);

    if (!dadosExtraidos.length) {
        sendResponse({
            success: false,
            message: "Nenhum dado válido foi extraído."
        });
        return;
    }

    const valorCapturado = dadosExtraidos
        .map(linha => linha.join(";"))
        .join("\n");

    console.log("=== Dados extraídos do Classroom ===");
    console.table(
        dadosExtraidos.map(linha => ({
            aluno: linha[0],
            notasExtraidas: linha.slice(1, -1).join(";"),
            notaParaAplicar: linha[linha.length - 1],
            linhaFinal: linha.join(";")
        }))
    );

    chrome.storage.local.set({ valorCapturado }, () => {
        sendResponse({
            success: true,
            message: `${dadosExtraidos.length} linhas capturadas com sucesso.`
        });
    });
}

function extrairDadosDaLinha(tr) {
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
        .map(extrairValorDaColuna)
        .filter(valor => valor !== "");

    const ultimaNotaValida = extrairUltimaNotaValida(notas);

    if (ultimaNotaValida === null) {
        console.warn("[Notas Flow] Nenhuma nota válida encontrada para o aluno:", {
            aluno: nomeAluno,
            notas
        });
        return null;
    }

    return [
        nomeAluno,
        ...notas,
        ultimaNotaValida
    ];
}

function extrairUltimaNotaValida(notas) {
    let ultimaNotaValida = null;

    notas.forEach(nota => {
        const numero = converterParaNumero(nota);

        if (numero !== null) {
            ultimaNotaValida = normalizarValor(nota);
        }
    });

    return ultimaNotaValida;
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
        return null;
    }

    const numero = String(valor)
        .replace(",", ".")
        .replace(/[^\d.-]/g, "");

    if (!numero) {
        return null;
    }

    const convertido = Number(numero);

    return Number.isFinite(convertido) ? convertido : null;
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
    chrome.storage.local.get("valorCapturado", result => {
        const valorCapturado = result.valorCapturado;

        if (!valorCapturado) {
            sendResponse({
                success: false,
                message: "Nenhum valor capturado ainda."
            });
            return;
        }

        const registros = valorCapturado
            .split("\n")
            .map(linha => linha.trim())
            .filter(Boolean)
            .map(linha => {
                const partes = linha.split(";");

                return {
                    nome: partes[0],
                    notaParaAplicar: partes[partes.length - 1],
                    linhaOriginal: linha
                };
            });

        let aplicados = 0;
        const naoEncontrados = [];

        registros.forEach(registro => {
            const tr = localizarLinhaPorNome(registro.nome);

            if (!tr) {
                naoEncontrados.push(registro.nome);
                return;
            }

            const input = Array.from(tr.querySelectorAll("input"))
                .find(input => {
                    if (input.disabled || input.type === "hidden") {
                        return false;
                    }

                    return String(input.value || "").trim() === "";
                });

            if (!input) {
                naoEncontrados.push(`${registro.nome} - input não encontrado`);
                return;
            }

            preencherInput(input, registro.notaParaAplicar);
            aplicados++;
        });

        console.log("=== Aplicação de notas no IESB ===");
        console.log("Registros capturados:", registros);
        console.log("Aplicados:", aplicados);
        console.log("Não encontrados:", naoEncontrados);

        sendResponse({
            success: true,
            message: `Aplicados: ${aplicados}. Não encontrados: ${naoEncontrados.length}.`
        });
    });
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