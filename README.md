# IESB Chrome Extension

Extensão Chrome desenvolvida para automatizar atividades operacionais dos docentes do IESB.

---

# Objetivos da extensão

A extensão possui dois grandes objetivos:

## 1. Automação de notas

Permitir:

- Capturar notas e trabalhos diretamente do Google Classroom.
- Consolidar os valores automaticamente.
- Aplicar os resultados no sistema Online do IESB.

## 2. Automação de presença/frequência

Permitir:

- Interceptar downloads realizados no Google Drive.
- Processar automaticamente arquivos Excel contendo presença dos alunos.
- Consolidar os dados de presença por aluno e por aula.
- Identificar presença e ausência automaticamente.
- Aplicar as faltas diretamente no sistema Online do IESB.
- Exibir relatórios completos das aulas processadas.

---

# Funcionalidades atuais

## Captura automática de downloads

A extensão intercepta downloads realizados no navegador.

Quando o download contém:

- Arquivos `.xlsx`
- Arquivos `.xls`
- Arquivos `.zip` contendo planilhas

A extensão:

1. Carrega os arquivos em memória.
2. Processa automaticamente as presenças.
3. Consolida os dados por aluno.
4. Salva os dados no `chrome.storage.local`.
5. Exibe um resumo no popup da extensão.

---

# Regras de presença

A presença dos alunos é calculada automaticamente conforme o tempo identificado nos relatórios.

## Regras atuais

### Presente

Considerado presente quando:

- Possui horas no tempo de permanência.
- Possui pelo menos 20 minutos.

Exemplos:

```txt
1 h
1 h 10 min
20 min
35 min
```

### Falta

Considerado falta quando:

- Possui apenas segundos.
- Possui menos de 20 minutos.
- Não aparece na lista de presença da aula.

Exemplos:

```txt
30 s
10 min
5 min
```

---

# Fluxo de funcionamento

## Processamento da presença

```txt
Google Drive
↓
Download interceptado
↓
ZIP/Excel carregado em memória
↓
Processamento das planilhas
↓
Consolidação por aluno
↓
Dados salvos em memória
↓
Aplicação automática no IESB
```

---

# Sites suportados

## Google Classroom

Utilizado para:

- Captura de notas.
- Captura de trabalhos.

URL:

```txt
https://classroom.google.com/
```

---

## Google Drive

Utilizado para:

- Download dos relatórios de presença.
- Interceptação automática dos arquivos.

URL:

```txt
https://drive.google.com/
```

---

## Online IESB

Utilizado para:

- Aplicação das notas.
- Aplicação automática das faltas.

URL:

```txt
https://online.iesb.br/
```

---

# Instalação da extensão

## 1. Abrir as extensões do Chrome

Acesse:

```txt
chrome://extensions/
```

---

## 2. Ativar modo desenvolvedor

Ative a opção:

```txt
Modo do desenvolvedor
```

no canto superior direito.

---

## 3. Carregar a extensão

Clique em:

```txt
Carregar sem compactação
```

E selecione a pasta do projeto.

---

# Como usar

# Processar presença

## 1. Abrir o Google Drive

Acesse:

```txt
https://drive.google.com/
```

---

## 2. Fazer download do relatório

A extensão interceptará automaticamente o download.

---

## 3. Confirmar processamento

Após o processamento:

- O botão ficará verde.
- Será exibida a mensagem:

```txt
Download interceptado e processado com sucesso.
```

---

## 4. Visualizar relatório

Clique em:

```txt
Ver relatório completo
```

para visualizar:

- Presenças por aula.
- Consolidado por aluno.
- Total de faltas.
- Total de presenças.

---

## 5. Aplicar faltas no IESB

Acesse a tela de frequência do Online IESB.

A extensão:

1. Identificará automaticamente a data da aula.
2. Comparará os alunos da página com os dados em memória.
3. Marcará falta para alunos ausentes.
4. Removerá falta de alunos presentes.

Ao final:

- Será exibido um resumo da aplicação.
- O usuário verá quantidade de presentes e ausentes.

---

# Estrutura dos arquivos

```txt
IESB Chrome Extension
│
├── background.js
├── content.js
├── popup.html
├── popup.js
├── relatorio.html
├── relatorio.js
├── manifest.json
│
├── libs/
│   ├── jszip.min.js
│   └── xlsx.full.min.js
│
├── modules/
│   ├── notas-flow.js
│   ├── presenca-aplicacao-flow.js
│   ├── presenca-download-flow.js
│   ├── presenca-processor.js
│   └── storage-service.js
│
└── utils/
    ├── date-utils.js
    └── text-utils.js
```

---

## background.js

Service Worker principal da extensão.

Responsável por:

- Carregar bibliotecas e módulos.
- Registrar listeners.
- Interceptar downloads.
- Delegar o fluxo de presença.
- Centralizar a configuração do Service Worker.

---

## content.js

Script injetado nas páginas suportadas.

Responsável por:

- Receber mensagens do popup.
- Roteiar ações para os módulos corretos.
- Manter a integração entre a página e os fluxos especializados.

---

## popup.js

Controlador principal do popup da extensão.

Responsável por:

- Identificar a página atual.
- Atualizar status visuais.
- Exibir resumo do processamento.
- Abrir relatórios.
- Controlar os botões da extensão.

---

## relatorio.html / relatorio.js

Tela de relatório interno da extensão.

Responsável por:

- Exibir aulas processadas.
- Mostrar consolidado por aluno.
- Mostrar faltas e presenças.
- Exibir tabelas detalhadas.

---

# Pasta libs

Contém bibliotecas externas utilizadas pela extensão.

## jszip.min.js

Biblioteca utilizada para:

- Abrir ZIPs em memória.
- Ler arquivos compactados.
- Localizar planilhas dentro de subpastas.

---

## xlsx.full.min.js

Biblioteca SheetJS utilizada para:

- Ler arquivos Excel.
- Interpretar planilhas `.xlsx` e `.xls`.
- Converter dados para JSON.

---

# Pasta modules

Contém os fluxos principais da aplicação.

---

## notas-flow.js

Responsável pelo fluxo de notas.

Funções principais:

- Capturar notas do Google Classroom.
- Consolidar totais.
- Aplicar notas no Online IESB.
- Localizar inputs automaticamente.

---

## presenca-aplicacao-flow.js

Responsável pela aplicação automática das faltas.

Funções principais:

- Identificar a data da aula na página.
- Comparar dados em memória.
- Localizar alunos.
- Marcar/desmarcar faltas.
- Exibir resumo final da aplicação.

---

## presenca-download-flow.js

Responsável pelo fluxo de downloads.

Funções principais:

- Interceptar downloads.
- Processar ZIPs.
- Processar Excel direto.
- Carregar arquivos em memória.
- Enviar arquivos para o processador de presença.

---

## presenca-processor.js

Módulo principal de processamento das presenças.

Funções principais:

- Ler planilhas.
- Interpretar tempo de permanência.
- Consolidar presença por aluno.
- Consolidar presença por aula.
- Calcular faltas.
- Gerar estrutura para aplicação automática.

---

## storage-service.js

Camada centralizada de acesso ao `chrome.storage.local`.

Funções principais:

- Salvar dados em memória.
- Recuperar dados processados.
- Limpar dados.
- Centralizar chaves da extensão.

---

# Pasta utils

Contém funções auxiliares reutilizáveis.

---

## text-utils.js

Responsável por:

- Normalizar textos.
- Remover acentos.
- Padronizar nomes.
- Facilitar comparação de alunos.

---

## date-utils.js

Responsável por:

- Converter datas.
- Padronizar formatos.
- Extrair datas de textos.
- Facilitar comparação de aulas.

---

# Tecnologias utilizadas

- JavaScript Vanilla
- Chrome Extensions Manifest V3
- JSZip
- SheetJS (XLSX)
- Chrome Storage API
- Chrome Downloads API

---

# Autor

```txt
Nominato Tecnologia
```