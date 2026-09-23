const { after, test } = require('node:test');
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

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await fsPromises.rm(storageDir, { recursive: true, force: true });
});

test('expõe o health check', async () => {
  await startServer();

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

test('faz upload, lista e baixa o documento', async () => {
  const formData = new FormData();
  formData.append('file', new Blob(['conteudo seguro']), '../relatorio.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-123' },
    body: formData,
  });
  const document = await uploadResponse.json();

  assert.strictEqual(uploadResponse.status, 201);
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.owner, 'user-123');
  assert.ok(document.id);
  assert.strictEqual(document.storedName, undefined);

  const storedFiles = await fsPromises.readdir(storageDir);
  assert.strictEqual(storedFiles.length, 1);
  assert.match(storedFiles[0], /^[0-9a-f-]{36}\.txt$/);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual((await listResponse.json()).documents, [document]);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo seguro');
});
