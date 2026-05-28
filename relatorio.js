document.addEventListener("DOMContentLoaded", async () => {
    const loading = document.getElementById("loading");
    const conteudo = document.getElementById("conteudo");

    try {
        const { presencaConsolidadoPorAluno } =
            await chrome.storage.local.get("presencaConsolidadoPorAluno");

        if (!presencaConsolidadoPorAluno) {
            loading.innerText = "Nenhum dado de presença processado foi encontrado.";
            return;
        }

        preencherResumoGeral(presencaConsolidadoPorAluno);
        preencherResumoPorAula(presencaConsolidadoPorAluno);
        preencherConsolidadoPorAluno(presencaConsolidadoPorAluno);

        loading.style.display = "none";
        conteudo.style.display = "block";
    } catch (error) {
        console.error("[Relatório Presença] Erro ao carregar relatório:", error);
        loading.innerText = "Erro ao carregar os dados do relatório.";
    }
});

function preencherResumoGeral(dados) {
    document.getElementById("totalArquivos").innerText = dados.totalArquivosProcessados ?? 0;
    document.getElementById("totalAlunos").innerText = dados.totalAlunos ?? 0;
    document.getElementById("totalAulas").innerText = dados.totalAulas ?? 0;
    document.getElementById("totalRegistros").innerText = dados.totalRegistros ?? 0;
}

function preencherResumoPorAula(dados) {
    const tbody = document.getElementById("tbodyResumoAulas");
    tbody.innerHTML = "";

    const resumo = calcularResumoPorData(dados);

    resumo.forEach(aula => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${aula.dataFormatada}</td>
            <td class="presente">${aula.presencas}</td>
            <td class="falta">${aula.faltas}</td>
        `;

        tbody.appendChild(tr);
    });
}

function preencherConsolidadoPorAluno(dados) {
    const thead = document.getElementById("theadConsolidado");
    const tbody = document.getElementById("tbodyConsolidado");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const datasAulas = dados.datasAulas || [];
    const alunos = dados.consolidadoParaAplicacao || [];

    const trHead = document.createElement("tr");

    trHead.innerHTML = `
        <th>Aluno</th>
        ${datasAulas.map(data => `<th>${formatarData(data)}</th>`).join("")}
        <th>Presenças</th>
        <th>Faltas</th>
        <th>Faltas ponderadas</th>
        <th>Total de aulas</th>
    `;

    thead.appendChild(trHead);

    alunos.forEach(aluno => {
        const tr = document.createElement("tr");

        const colunasDatas = datasAulas.map(data => {
            const presente = aluno.presencasPorData?.[data] === 1;

            return presente
                ? `<td class="presente">Presente</td>`
                : `<td class="falta">Falta</td>`;
        }).join("");

        tr.innerHTML = `
            <td>${aluno.nomeCompleto || ""}</td>
            ${colunasDatas}
            <td>${aluno.presencas ?? 0}</td>
            <td>${aluno.faltas ?? 0}</td>
            <td>${aluno.faltasPonderadas ?? 0}</td>
            <td>${aluno.totalAulas ?? 0}</td>
        `;

        tbody.appendChild(tr);
    });
}

function calcularResumoPorData(dados) {
    const datasAulas = dados.datasAulas || [];
    const alunos = dados.consolidadoParaAplicacao || [];

    return datasAulas.map(data => {
        let presencas = 0;
        let faltas = 0;

        alunos.forEach(aluno => {
            if (aluno.presencasPorData?.[data] === 1) {
                presencas++;
            } else {
                faltas++;
            }
        });

        return {
            data,
            dataFormatada: formatarData(data),
            presencas,
            faltas,
        };
    });
}

function formatarData(dataIso) {
    if (!dataIso) return "";

    const partes = dataIso.split("-");

    if (partes.length !== 3) {
        return dataIso;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}