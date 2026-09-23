const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
const app = require('../src/app');

let server;
let baseUrl;

async function startServer() {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
}

async function uploadSampleDocument({
  content = 'conteudo seguro',
  fileName = 'relatorio.txt',
  owner = 'user-123',
} = {}) {
  const formData = new FormData();
  formData.append('file', new Blob([content]), fileName);

  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: formData,
  });

  return { response, document: await response.json() };
}

before(async () => {
  await startServer();
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await fsPromises.rm(storageDir, { recursive: true, force: true });
});

test('expõe o health check', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('rejeita upload sem arquivo com erro estruturado', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });

  assert.strictEqual(response.status, 400);
  assert.deepStrictEqual(await response.json(), {
    error: {
      code: 'FILE_REQUIRED',
      message: 'O campo "file" é obrigatório.',
    },
  });
});

test('expõe os endpoints de upload, listagem e download', async (t) => {
  let uploadedDocument;

  await t.test('faz upload do documento', async () => {
    const { response, document } = await uploadSampleDocument({
      fileName: '../relatorio.txt',
    });

    assert.strictEqual(response.status, 201);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.owner, 'user-123');
    assert.ok(document.id);
    assert.strictEqual(document.storedName, undefined);

    const storedFiles = await fsPromises.readdir(storageDir);
    assert.strictEqual(storedFiles.length, 1);
    assert.match(storedFiles[0], /^[0-9a-f-]{36}\.txt$/);

    uploadedDocument = document;
  });

  await t.test('lista documentos enviados', async () => {
    const listResponse = await fetch(`${baseUrl}/documents`);
    const { documents } = await listResponse.json();

    assert.strictEqual(listResponse.status, 200);
    assert.ok(documents.some((document) => document.id === uploadedDocument.id));
    assert.deepStrictEqual(
      documents.find((document) => document.id === uploadedDocument.id),
      uploadedDocument,
    );
  });

  await t.test('baixa documento pelo id', async () => {
    const downloadResponse = await fetch(`${baseUrl}/documents/${uploadedDocument.id}/download`);

    assert.strictEqual(downloadResponse.status, 200);
    assert.strictEqual(await downloadResponse.text(), 'conteudo seguro');
  });
});
