/**
 * Conteúdo temporário para virar o presenca-processor.js
 * Dependência esperada: XLSX global.
 */

async function processarArquivosPresenca(arquivosExcel) {
    const dadosConsolidados = [];

    for (const arquivo of arquivosExcel) {
        const contexto = obterContextoDoArquivo(arquivo);
        const linhas = await processarArquivoExcel(arquivo, contexto);
        dadosConsolidados.push(...linhas);
    }

    const datasAulas = obterDatasDisponiveis(dadosConsolidados);
    const consolidadoPorAluno = montarConsolidadoPorAluno(dadosConsolidados, datasAulas);
    const resumoPorAluno = montarResumoPorAluno(dadosConsolidados, datasAulas.length);

    const consolidadoParaAplicacao = montarConsolidadoParaAplicacao(consolidadoPorAluno, datasAulas);

    const resultado = {
        processadoEm: new Date().toISOString(),
        totalArquivosProcessados: arquivosExcel.length,
        totalRegistros: dadosConsolidados.length,
        totalAulas: datasAulas.length,
        totalAlunos: consolidadoPorAluno.length,
        dadosConsolidados,
        datasAulas,
        consolidadoPorAluno,
        resumoPorAluno,
        consolidadoParaAplicacao,
    };

    imprimirPresencasPorAula(dadosConsolidados);
    imprimirConsolidadoPorAluno(consolidadoPorAluno, datasAulas);
    imprimirResumoPorAluno(resumoPorAluno);
    imprimirConsolidadoParaAplicacao(consolidadoParaAplicacao);

    await salvarConsolidadoPresencaEmMemoria(resultado);

    return resultado;
}

async function processarArquivoExcel(arquivo, contexto) {
    const workbook = XLSX.read(arquivo.arrayBuffer, {
        type: 'array',
    });

    const primeiraAba = workbook.SheetNames[0];

    if (!primeiraAba) {
        throw new Error(`O arquivo "${arquivo.caminho || arquivo.nome}" não possui abas.`);
    }

    const sheet = workbook.Sheets[primeiraAba];

    const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
    });

    return linhas.map((linha, index) => {
        const duracaoMinutos = converterDuracaoParaMinutos(linha['Duração']);
        const status = duracaoMinutos >= 20 ? 'Presente' : 'Falta';

        return {
            DataOriginal: contexto.data,
            Data: formatarData(contexto.data),
            ...normalizarLinha(linha),
            Status: status,
            pastaOrigem: contexto.nomePasta,
            arquivoOrigem: arquivo.nome,
            caminhoOrigem: arquivo.caminho,
            numeroLinha: index + 2,
        };
    });
}

function criarArquivoPresenca(nome, caminho, arrayBuffer) {
    return {
        nome,
        caminho: caminho || nome,
        arrayBuffer,
    };
}

function obterContextoDoArquivo(arquivo) {
    const caminho = arquivo.caminho || arquivo.nome || '';
    const partes = caminho.split('/');

    const nomePasta = partes.length >= 2 ? partes[partes.length - 2] : '';
    const data = extrairDataDoNome(nomePasta);

    return {
        nomePasta,
        data,
    };
}

function extrairDataDoNome(nome) {
    const match = String(nome || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
}

function normalizarLinha(linha) {
    const novaLinha = {};

    Object.keys(linha || {}).forEach(coluna => {
        const nomeNormalizado = coluna === 'Enviar e-mail' ? 'e-mail' : coluna;
        novaLinha[nomeNormalizado] = linha[coluna];
    });

    return novaLinha;
}

function montarResumoPorAluno(dados, totalAulas) {
    const mapa = {};

    dados.forEach(linha => {
        const nome = String(linha['Nome'] || '').trim();
        const sobrenome = String(linha['Sobrenome'] || '').trim();
        const chave = `${nome}|${sobrenome}`.toLowerCase();

        if (!mapa[chave]) {
            mapa[chave] = {
                nome,
                sobrenome,
                presenca: 0,
                falta: 0,
                participacoes: 0,
                total: totalAulas,
                percentual: '0.00',
            };
        }

        if (linha.Status === 'Presente') mapa[chave].presenca++;
        if (linha.Status === 'Falta') mapa[chave].falta++;

        mapa[chave].participacoes++;
    });

    Object.values(mapa).forEach(aluno => {
        aluno.percentual = totalAulas > 0
            ? ((aluno.presenca / totalAulas) * 100).toFixed(2)
            : '0.00';
    });

    return Object.values(mapa).sort(compararAlunosPorNomeCompleto);
}

function montarConsolidadoPorAluno(dados, datasAulas) {
    const mapa = {};

    dados.forEach(linha => {
        const nome = String(linha['Nome'] || '').trim();
        const sobrenome = String(linha['Sobrenome'] || '').trim();
        const chave = `${nome}|${sobrenome}`.toLowerCase();

        if (!mapa[chave]) {
            mapa[chave] = {
                nome,
                sobrenome,
                presencasPorData: {},
            };

            datasAulas.forEach(data => {
                mapa[chave].presencasPorData[data] = 0;
            });
        }

        if (linha.Status === 'Presente' && linha.DataOriginal) {
            mapa[chave].presencasPorData[linha.DataOriginal] = 1;
        }
    });

    return Object.values(mapa).sort(compararAlunosPorNomeCompleto);
}

function montarConsolidadoParaAplicacao(consolidadoPorAluno, datasAulas) {
    return consolidadoPorAluno.map(aluno => {
        const nomeCompleto = `${aluno.nome} ${aluno.sobrenome}`.trim();
        const quantidadeFaltas = datasAulas.filter(data => aluno.presencasPorData[data] !== 1).length;
        const faltasPonderadas = quantidadeFaltas * 1.5;

        const presencasPorDataFormatada = {};

        datasAulas.forEach(data => {
            presencasPorDataFormatada[formatarData(data)] = aluno.presencasPorData[data] === 1 ? 1 : 0;
        });

        return {
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
            nomeCompleto,
            presencas: datasAulas.length - quantidadeFaltas,
            faltas: quantidadeFaltas,
            faltasPonderadas,
            totalAulas: datasAulas.length,
            presencasPorData: aluno.presencasPorData,
            presencasPorDataFormatada,
        };
    });
}

async function salvarConsolidadoPresencaEmMemoria(resultado) {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
        console.warn('[Presença Processor] chrome.storage.local indisponível. Consolidado não foi salvo em memória.');
        return;
    }

    await chrome.storage.local.set({
        presencaConsolidadoPorAluno: resultado,
    });

    console.log('[Presença Processor] Consolidado por aluno salvo em memória da extensão:', {
        chave: 'presencaConsolidadoPorAluno',
        totalArquivosProcessados: resultado.totalArquivosProcessados,
        totalAlunos: resultado.totalAlunos,
        totalAulas: resultado.totalAulas,
        processadoEm: resultado.processadoEm,
    });
}

function imprimirConsolidadoParaAplicacao(consolidadoParaAplicacao) {
    console.log('[Presença Processor] Consolidado para aplicação na próxima página:');
    console.table(consolidadoParaAplicacao.map(aluno => ({
        nomeCompleto: aluno.nomeCompleto,
        presencas: aluno.presencas,
        faltas: aluno.faltas,
        faltasPonderadas: aluno.faltasPonderadas,
        totalAulas: aluno.totalAulas,
    })));
}

function calcularFaltasPonderadas(aluno, datasAulas) {
    const quantidadeFaltas = datasAulas.filter(data => aluno.presencasPorData[data] !== 1).length;
    return quantidadeFaltas * 1.5;
}

function obterDatasDisponiveis(dados) {
    return Array.from(
        new Set(
            dados
                .map(linha => linha.DataOriginal)
                .filter(Boolean)
        )
    ).sort();
}

function ordenarPorDataENome(dados) {
    return [...dados].sort((a, b) => {
        const dataA = a.DataOriginal || '';
        const dataB = b.DataOriginal || '';

        if (dataA !== dataB) {
            return dataA.localeCompare(dataB);
        }

        const nomeA = String(a['Nome'] || '').trim();
        const nomeB = String(b['Nome'] || '').trim();

        return nomeA.localeCompare(nomeB, 'pt-BR', {
            sensitivity: 'base',
        });
    });
}

function compararAlunosPorNomeCompleto(a, b) {
    const nomeA = `${a.nome} ${a.sobrenome}`;
    const nomeB = `${b.nome} ${b.sobrenome}`;

    return nomeA.localeCompare(nomeB, 'pt-BR', {
        sensitivity: 'base',
    });
}

function formatarData(dataIso) {
    if (!dataIso) return '';

    const partes = dataIso.split('-');

    if (partes.length !== 3) {
        return dataIso;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function converterDuracaoParaMinutos(valor) {
    if (!valor) return 0;

    if (typeof valor === 'number') {
        return valor * 24 * 60;
    }

    const texto = String(valor).trim().toLowerCase();

    if (/\d+\s*h\b/.test(texto)) {
        const matchHoras = texto.match(/(\d+)\s*h\b/);
        const matchMinutos = texto.match(/(\d+)\s*min\b/);

        const horas = matchHoras ? Number(matchHoras[1]) : 0;
        const minutos = matchMinutos ? Number(matchMinutos[1]) : 0;

        return horas * 60 + minutos;
    }

    const matchMinutosTexto = texto.match(/(\d+)\s*min/);
    if (matchMinutosTexto) {
        return Number(matchMinutosTexto[1]);
    }

    const matchHorario = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (matchHorario) {
        const parte1 = Number(matchHorario[1]);
        const parte2 = Number(matchHorario[2]);
        const parte3 = Number(matchHorario[3] || 0);

        if (matchHorario[3]) {
            return parte1 * 60 + parte2 + parte3 / 60;
        }

        return parte1 + parte2 / 60;
    }

    const matchNumero = texto.match(/(\d+)/);
    return matchNumero ? Number(matchNumero[1]) : 0;
}

function imprimirPresencasPorAula(dados) {
    const linhas = ordenarPorDataENome(dados).map(linha => ({
        data: formatarData(linha.DataOriginal),
        pasta: linha.pastaOrigem,
        arquivo: linha.arquivoOrigem,
        nome: linha['Nome'] || '',
        sobrenome: linha['Sobrenome'] || '',
        duracao: linha['Duração'] || '',
        status: linha.Status,
    }));

    console.log('[Presença Processor] Presenças por aula:');
    console.table(linhas);
}

function imprimirConsolidadoPorAluno(consolidadoPorAluno, datasAulas) {
    const linhas = consolidadoPorAluno.map(aluno => {
        const linha = {
            nome: aluno.nome,
            sobrenome: aluno.sobrenome,
        };

        datasAulas.forEach(data => {
            linha[formatarData(data)] = aluno.presencasPorData[data] === 1 ? 'Presente' : 'Falta';
        });

        linha.faltas = calcularFaltasPonderadas(aluno, datasAulas);

        return linha;
    });

    console.log('[Presença Processor] Consolidado por aluno:');
    console.table(linhas);
}

function imprimirResumoPorAluno(resumoPorAluno) {
    console.log('[Presença Processor] Resumo por aluno:');
    console.table(resumoPorAluno);
}