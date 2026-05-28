

/**
 * presenca-download-flow.js
 *
 * Fluxo responsável pelo processamento automático de downloads de presença.
 *
 * Responsabilidades principais:
 * - Interceptar downloads realizados no navegador.
 * - Identificar arquivos ZIP e Excel.
 * - Descompactar arquivos ZIP em memória.
 * - Localizar planilhas dentro das subpastas.
 * - Processar arquivos Excel diretamente.
 * - Enviar os arquivos encontrados para o presenca-processor.
 * - Registrar logs detalhados do processamento.
 */

async function processarDownloadPresenca(downloadItem) {
    console.log('[IESB Extension] Download iniciado');
    console.log('[IESB Extension] Nome:', downloadItem.filename);
    console.log('[IESB Extension] URL:', downloadItem.url);

    try {
        console.log('[IESB Extension] Baixando arquivo em memória...');

        const response = await fetch(downloadItem.url);
        const arrayBuffer = await response.arrayBuffer();

        const processouZip = await processarComoZip(downloadItem, arrayBuffer);

        if (processouZip) {
            return;
        }

        await processarComoExcelDireto(downloadItem, arrayBuffer);
    } catch (error) {
        console.error('[IESB Extension] Erro ao processar download:', error);
    }
}

async function processarComoZip(downloadItem, arrayBuffer) {
    try {
        console.log('[IESB Extension] Tentando processar como ZIP...');

        const zip = await JSZip.loadAsync(arrayBuffer);

        const arquivosExcel = [];

        for (const caminhoArquivo of Object.keys(zip.files)) {
            const arquivoZip = zip.files[caminhoArquivo];

            if (arquivoZip.dir) {
                continue;
            }

            const nomeMinusculo = caminhoArquivo.toLowerCase();

            if (!nomeMinusculo.endsWith('.xlsx') && !nomeMinusculo.endsWith('.xls')) {
                continue;
            }

            console.log('[IESB Extension] Excel encontrado no ZIP:', caminhoArquivo);

            const excelArrayBuffer = await arquivoZip.async('arraybuffer');

            arquivosExcel.push(
                criarArquivoPresenca(
                    caminhoArquivo.split('/').pop(),
                    caminhoArquivo,
                    excelArrayBuffer
                )
            );
        }

        if (!arquivosExcel.length) {
            console.warn('[IESB Extension] Nenhum Excel encontrado dentro do ZIP');
            return false;
        }

        const resultado = await processarArquivosPresenca(arquivosExcel);

        imprimirResultadoPresenca(resultado);

        return true;
    } catch (error) {
        console.warn('[IESB Extension] Arquivo não é um ZIP válido:', error);
        return false;
    }
}

async function processarComoExcelDireto(downloadItem, arrayBuffer) {
    try {
        console.log('[IESB Extension] Tentando processar como Excel direto...');

        const nomeArquivo =
            downloadItem.filename ||
            obterNomeArquivoPelaUrl(downloadItem.url) ||
            'arquivo.xlsx';

        const arquivosExcel = [
            criarArquivoPresenca(
                nomeArquivo,
                nomeArquivo,
                arrayBuffer
            )
        ];

        const resultado = await processarArquivosPresenca(arquivosExcel);

        imprimirResultadoPresenca(resultado);
    } catch (error) {
        console.error('[IESB Extension] Falha ao processar Excel direto:', error);
    }
}

function imprimirResultadoPresenca(resultado) {
    console.log('[IESB Extension] Resultado do processamento de presença:');
    console.log(resultado);

    if (!resultado) {
        console.warn('[IESB Extension] Nenhum resultado retornado pelo processador');
        return;
    }

    console.log('[IESB Extension] Resumo:');
    console.table({
        totalArquivosProcessados: resultado.totalArquivosProcessados,
        totalAlunos: resultado.totalAlunos,
        totalAulas: resultado.totalAulas,
        totalRegistros: resultado.totalRegistros,
    });

    console.log('[IESB Extension] Consolidado por aluno:');
    console.table(resultado.consolidadoParaAplicacao || []);
}

function obterNomeArquivoPelaUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split('/').pop();
    } catch {
        return '';
    }
}