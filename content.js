chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "capturar") {
            capturarValor(sendResponse);
            return true;
        }

        if (message.action === "aplicar") {
            aplicarValorNoPrimeiroInput(sendResponse);
            return true;
        }

        sendResponse({
            success: false,
            message: "Ação não reconhecida."
        });

        return true;
    } catch (error) {
        sendResponse({
            success: false,
            message: `Erro no content.js: ${error.message}`
        });

        return true;
    }
});

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

    const linhasDeDados = linhas.slice(1); // ignora a primeira linha do tbody

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
            valores: linha.slice(1, -1).join(";"),
            total: linha[linha.length - 1],
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

    const total = notas.reduce((soma, valor) => {
        return soma + converterParaNumero(valor);
    }, 0);

    return [
        nomeAluno,
        ...notas,
        formatarNumero(total)
    ];
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

    // 1. Primeiro tenta pegar a nota visual: exemplo 7/7, 3/3
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

    // 2. Depois tenta pegar pelo aria-label: "7 Editar a nota de ..."
    const ariaLabelNota = Array.from(coluna.querySelectorAll("[aria-label]"))
        .map(el => el.getAttribute("aria-label")?.trim())
        .find(label => label && /^\d+([.,]\d+)?\s+Editar a nota/i.test(label));

    if (ariaLabelNota) {
        const match = ariaLabelNota.match(/^(\d+([.,]\d+)?)/);

        if (match) {
            return normalizarValor(match[1]);
        }
    }

    // 3. Ignora sem nota, carregamento e coluna de ação
    const textoColuna = coluna.innerText?.trim() || "";

    if (
        !textoColuna ||
        textoColuna.includes("Sem nota") ||
        textoColuna.includes("Carregando") ||
        textoColuna.includes("Mais opções")
    ) {
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
                    total: partes[partes.length - 1],
                    linhaOriginal: linha
                };
            });

        let aplicados = 0;
        let naoEncontrados = [];

        registros.forEach(registro => {
            const tr = localizarLinhaPorNome(registro.nome);

            if (!tr) {
                naoEncontrados.push(registro.nome);
                return;
            }

            const input = Array.from(tr.querySelectorAll("input"))
                .find(input => !input.disabled && input.type !== "hidden");

            if (!input) {
                naoEncontrados.push(`${registro.nome} - input não encontrado`);
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

function normalizarNome(nome) {
    return String(nome || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s*-\s*Matriculado\s*/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
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