// Configuração de armazenamento local, seguindo o princípio 12-Factor (variáveis de ambiente).

const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_STORAGE_DIR = path.join(__dirname, '..', '..', 'storage');
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || DEFAULT_STORAGE_DIR);
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

function ensureStorageDir() {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Resolve o nome físico dentro de STORAGE_DIR, evitando path traversal.
function resolveStoragePath(storedName) {
  const resolved = path.resolve(STORAGE_DIR, storedName);
  if (resolved !== STORAGE_DIR && !resolved.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error('Caminho de armazenamento inválido.');
  }
  return resolved;
}

module.exports = { STORAGE_DIR, MAX_FILE_SIZE, ensureStorageDir, resolveStoragePath };
