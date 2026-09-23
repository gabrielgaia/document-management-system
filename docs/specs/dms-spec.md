# Especificação - Document Management System

## 1. Objetivo

O Document Management System (DMS) deve permitir que usuários enviem,
consultem e baixem documentos armazenados no filesystem local da aplicação,
mantendo seus metadados em memória nesta primeira versão.

## 2. Escopo

### 2.1 Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos disponíveis para o usuário lógico informado.
- Download do conteúdo de um documento pelo seu identificador.
- Associação de cada documento a um `owner` lógico.
- Interface React para upload, listagem, estados de carregamento/erro e
  download.
- Endpoint de health check para verificar a disponibilidade do backend.

### 2.2 Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Banco de dados ou persistência dos metadados entre reinicializações.
- Autenticação, autorização e gerenciamento de contas.
- Versionamento, edição, exclusão, compartilhamento ou recuperação de arquivos.
- Busca avançada, filtros, paginação e organização em pastas.
- Validação por whitelist de MIME types ou extensões nesta fase.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Um `POST /upload` com multipart válido cria o arquivo local e retorna seus metadados. |
| RF-02 | O upload exige o campo `file`. | Requisições sem arquivo recebem erro de validação e não criam metadados. |
| RF-03 | Cada upload recebe um identificador único. | O ID é gerado pelo sistema e não depende do nome original do arquivo. |
| RF-04 | O documento é associado a um usuário lógico. | O valor de `X-User-Id` é usado como `owner`; quando ausente, usa-se `anonymous`. |
| RF-05 | O usuário pode listar documentos. | `GET /documents` retorna os metadados dos documentos disponíveis, mais recentes primeiro. |
| RF-06 | O usuário pode baixar um documento. | `GET /documents/:id/download` retorna o binário e sugere o nome original no download. |
| RF-07 | O sistema rejeita documentos acima do limite. | O limite é `MAX_FILE_SIZE`, com padrão de 10 MiB; a falha retorna erro sem registrar metadados. |
| RF-08 | O sistema trata documentos inexistentes. | Um ID não encontrado retorna `404` em vez de tentar acessar um caminho arbitrário. |
| RF-09 | O sistema trata falhas de armazenamento. | Falhas ao gravar ou ler o filesystem retornam erro controlado e não expõem stack trace ao cliente. |
| RF-10 | O sistema expõe um health check. | `GET /health` retorna `200` e `{ "status": "ok" }` quando o processo está disponível. |
| RF-11 | A interface informa o estado das operações. | O frontend apresenta estados de carregamento, sucesso, lista vazia e erro sem bloquear as demais ações. |

### 3.1 Regras de negócio

- O campo multipart obrigatório chama-se `file`.
- O nome original é preservado apenas como metadado e não é usado como nome
  físico confiável.
- O nome físico deve ser gerado pelo sistema com um identificador seguro, sem
  aceitar separadores de caminho ou trechos fornecidos pelo cliente.
- O usuário lógico não representa autenticação. O cliente pode informar
  `X-User-Id`, mas o backend não valida a identidade desse valor nesta fase.
- A listagem é ordenada por `uploadedAt` decrescente.
- Um metadado só deve ser publicado depois que o arquivo tiver sido gravado
  com sucesso. Se o registro em memória falhar após a gravação, a operação
  deve sinalizar erro e tentar remover o arquivo recém-criado.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend deve usar Node.js com Express e CommonJS. |
| RNF-02 | O frontend deve usar React, Vite, componentes funcionais e Hooks. |
| RNF-03 | O upload deve usar `multer` com `diskStorage`, gravando em `backend/storage`. |
| RNF-04 | Os metadados devem permanecer em memória nesta fase. |
| RNF-05 | Nenhum provedor externo de armazenamento ou upload pode ser usado. |
| RNF-06 | A configuração deve vir de variáveis de ambiente, seguindo o princípio 12-Factor. |
| RNF-07 | O backend deve respeitar o fluxo `routes -> controllers -> services -> repositories`. |
| RNF-08 | O frontend deve acessar a API por `fetch` usando o prefixo `/api` configurado no proxy do Vite. |
| RNF-09 | Erros devem ter formato previsível, sem detalhes internos, credenciais ou caminhos absolutos. |
| RNF-10 | O sistema deve evitar path traversal e não deve confiar em nomes de arquivo enviados pelo cliente para construir caminhos. |
| RNF-11 | O código deve ser testável com o runner nativo `node:test`, isolando filesystem e repositório quando necessário. |
| RNF-12 | O limite padrão de upload deve ser 10 MiB e poder ser substituído por `MAX_FILE_SIZE`. |

### 4.1 Limitação de persistência

Os arquivos permanecem no diretório local, mas o índice de metadados é perdido
quando o processo reinicia. Portanto, documentos enviados antes do reinício não
serão listáveis ou baixáveis pelo ID após esse evento, e podem permanecer como
arquivos órfãos em `backend/storage`. Persistência ou reindexação é uma evolução
fora desta versão.

## 5. Modelo de dados

### 5.1 Metadado público do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | sim | Identificador único gerado pelo sistema. |
| `originalName` | string | sim | Nome original informado pelo cliente, usado para exibição/download. |
| `size` | number | sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | sim | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | sim | Identificador do usuário lógico; padrão `anonymous`. |

Exemplo:

```json
{
  "id": "d7e8f901-2345-4678-9abc-def012345678",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-23T14:30:00.000Z",
  "owner": "user-123"
}
```

### 5.2 Metadado interno

O repositório pode manter campos internos que não devem ser retornados pela
API, como `storedName` ou `storagePath`. Esse valor deve apontar somente para o
arquivo gerado pelo sistema dentro de `backend/storage`; nunca deve ser
derivado diretamente de `originalName` nem aceito do cliente.

### 5.3 Coleção em memória

O repositório mantém uma coleção de documentos durante a vida do processo. A
listagem deve devolver cópias dos metadados, evitando que controllers ou
clientes alterem diretamente o estado interno. O repositório deve oferecer,
no mínimo, operações para criar, listar e buscar por ID.

## 6. Contratos de API

### 6.1 Convenção de prefixo

As rotas do backend são registradas sem prefixo: `/upload`, `/documents` e
`/documents/:id/download`. O frontend chama essas rotas com `/api`, por exemplo
`/api/documents`, porque o proxy do Vite remove `/api` antes de encaminhar a
requisição para o backend. O endpoint `/health` permanece acessível como
`/health`.

Respostas JSON usam `Content-Type: application/json; charset=utf-8` e erros
seguem este formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

O campo `code` é estável para o frontend; a mensagem é legível e não deve
conter stack trace, caminho local ou detalhes de infraestrutura.

### 6.2 `POST /upload`

**Objetivo:** gravar um novo documento e registrar seus metadados.

**Entrada:**

- `Content-Type: multipart/form-data`.
- Campo obrigatório `file`.
- Header opcional `X-User-Id`; se ausente ou vazio, `owner` será `anonymous`.

**Sucesso `201 Created`:** retorna o metadado público criado.

```json
{
  "id": "d7e8f901-2345-4678-9abc-def012345678",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-23T14:30:00.000Z",
  "owner": "user-123"
}
```

**Erros:**

| Status | Código | Situação |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | O campo `file` não foi enviado. |
| `413` | `FILE_TOO_LARGE` | O arquivo excede `MAX_FILE_SIZE`. |
| `500` | `STORAGE_WRITE_FAILED` | Falha ao criar ou gravar o arquivo local. |
| `500` | `DOCUMENT_CREATE_FAILED` | Falha ao registrar os metadados. |

### 6.3 `GET /documents`

**Objetivo:** listar metadados dos documentos.

**Entrada:**

- Header opcional `X-User-Id`.
- Sem corpo.

O escopo inicial retorna todos os documentos mantidos em memória. O header é
aceito desde já para que o serviço possa evoluir para filtragem por proprietário
sem mudar o contrato; não constitui autorização.

**Sucesso `200 OK`:**

```json
{
  "documents": [
    {
      "id": "d7e8f901-2345-4678-9abc-def012345678",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-09-23T14:30:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Uma coleção vazia deve retornar `200` com `"documents": []`.

**Erro:** `500` com código `DOCUMENT_LIST_FAILED` se a leitura do repositório
falhar.

### 6.4 `GET /documents/:id/download`

**Objetivo:** transmitir o arquivo associado ao ID.

**Entrada:**

- Parâmetro de rota `id`.
- Sem corpo.

**Sucesso `200 OK`:** retorna o conteúdo binário, com `Content-Type` baseado no
arquivo quando possível e `Content-Disposition: attachment` contendo o nome
original sanitizado para uso no cabeçalho.

**Erros:**

| Status | Código | Situação |
| --- | --- | --- |
| `404` | `DOCUMENT_NOT_FOUND` | Não existe metadado para o ID informado. |
| `404` | `FILE_NOT_FOUND` | O metadado existe, mas o arquivo não está no filesystem. |
| `500` | `STORAGE_READ_FAILED` | Falha inesperada ao abrir ou transmitir o arquivo. |

O caminho usado para leitura deve ser obtido do metadado interno e resolvido
dentro de `backend/storage`; o valor de `id` não pode ser concatenado livremente
em um caminho.

### 6.5 `GET /health`

**Sucesso `200 OK`:**

```json
{ "status": "ok" }
```

O endpoint não depende da existência de documentos e não deve expor informações
de ambiente.

## 7. Decisões arquiteturais

### 7.1 Backend

O backend seguirá uma Clean Architecture simples:

```text
routes -> controllers -> services -> repositories
```

- `routes/`: registra métodos, caminhos e middlewares, delegando o fluxo.
- `controllers/`: lê a requisição, extrai arquivo/headers/parâmetros, chama o
  serviço e traduz o resultado para HTTP.
- `services/`: aplica regras de negócio, limites, ordenação, associação de
  usuário e tratamento de operações compostas.
- `repositories/`: encapsula a coleção em memória e o filesystem local; não
  conhece Express nem detalhes de resposta HTTP.

O `multer` deve ser configurado na borda HTTP com `diskStorage`, usando um
destino fixo em `backend/storage` e um nome físico gerado pelo sistema. O
service não deve receber responsabilidade de interpretar `req` ou `res`.

### 7.2 Frontend

O frontend usará componentes funcionais organizados em:

- `services/`: funções `fetch` para upload, listagem e download.
- `components/UploadComponent`: seleção, envio e feedback do arquivo.
- `components/DocumentList`: exibição dos metadados e estado vazio/erro.
- `components/DownloadButton`: disparo do download do documento.
- `pages/`: composição da tela principal, se necessário.

As funções de serviço devem usar `/api` como base e tratar respostas não-2xx
com o formato de erro definido nesta especificação.

### 7.3 Configuração

Variáveis previstas:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `MAX_FILE_SIZE` | `10485760` | Limite do upload em bytes. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos, resolvido com segurança. |

O uso de `STORAGE_DIR` não permite trocar o armazenamento local por um serviço
externo; ele apenas torna configurável o diretório do filesystem da aplicação.

## 8. Plano de execução

As etapas abaixo descrevem a implementação futura e não fazem parte desta
entrega documental.

1. **Fundação e configuração:** confirmar scripts, variáveis de ambiente,
   criação segura de `backend/storage` e montagem das rotas no app.
2. **Repositórios:** implementar o repositório de metadados em memória e o
   acesso aos arquivos locais, incluindo criação, leitura, cópia de metadados e
   tratamento de falhas.
3. **Upload:** configurar `multer.diskStorage`, limite de tamanho e geração de
   nomes físicos seguros; garantir limpeza quando o registro falhar.
4. **Serviços:** implementar casos de uso de upload, listagem e download sem
   dependência de Express, incluindo owner, ordenação e regras de erro.
5. **Controllers e rotas:** conectar middlewares, controllers e serviços;
   preservar os contratos, códigos HTTP e formato JSON definidos acima.
6. **Testes de backend:** ampliar `node:test` para health check, upload válido e
   inválido, limite, listagem, download, IDs inexistentes, falhas de arquivo e
   isolamento entre testes.
7. **Frontend:** criar serviços `fetch`, `UploadComponent`, `DocumentList` e
   `DownloadButton`, cobrindo estados de carregamento, sucesso, erro e lista
   vazia.
8. **Integração:** validar o proxy `/api`, o download no navegador e a gravação
   em `backend/storage`, sem dependências externas.
9. **Revisão e evolução:** conferir Clean Architecture, segurança de caminhos,
   ausência de vazamento de dados internos e registrar como próximos passos a
   persistência dos metadados, autenticação e exclusão/versionamento.

### 8.1 Critérios de conclusão da implementação futura

- Todos os endpoints respondem conforme os contratos desta especificação.
- Uploads válidos geram arquivo local e metadado consistente.
- Arquivos não podem escapar do diretório de armazenamento por meio de nomes
  ou IDs fornecidos pelo cliente.
- Testes de backend passam sem depender de serviços externos.
- O frontend consome o backend pelo proxy `/api` e oferece upload, listagem e
  download utilizáveis.
- Apenas as camadas previstas conhecem suas respectivas responsabilidades.