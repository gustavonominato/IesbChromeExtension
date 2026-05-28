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

## background.js

Service Worker da extensão.

Responsável por:

- Interceptar downloads.
- Processar ZIPs.
- Processar Excels.
- Controlar o fluxo principal.

---

## content.js

Script executado nas páginas.

Responsável por:

- Captura de dados.
- Aplicação de notas.
- Aplicação automática de faltas.

---

## popup.js

Controla o popup da extensão.

Responsável por:

- Exibir status.
- Mostrar resumo.
- Abrir relatórios.

---

## presenca-processor.js

Módulo principal de processamento das presenças.

Responsável por:

- Ler planilhas.
- Interpretar tempo de permanência.
- Consolidar dados.
- Calcular faltas.

---

## relatorio.html / relatorio.js

Tela interna da extensão.

Responsável por:

- Exibir relatórios completos.
- Mostrar consolidados.
- Exibir estatísticas.

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