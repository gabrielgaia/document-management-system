// Regras de negócio do recurso de documentos: sem dependência de Express.

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const documentRepository = require('../repositories/document.repository');
const AppError = require('../errors/app-error');
const { resolveStoragePath } = require('../config/storage');

async function uploadDocument({ originalName, storedName, size, owner }) {
  const document = {
    id: crypto.randomUUID(),
    originalName,
    storedName,
    size,
    uploadedAt: new Date().toISOString(),
    owner: owner || 'anonymous',
  };

  try {
    return documentRepository.create(document);
  } catch (err) {
    await removeStoredFile(storedName);
    throw new AppError(500, 'DOCUMENT_CREATE_FAILED', 'Falha ao registrar os metadados do documento.');
  }
}

async function listDocuments() {
  try {
    return documentRepository.list();
  } catch (err) {
    throw new AppError(500, 'DOCUMENT_LIST_FAILED', 'Falha ao listar os documentos.');
  }
}

async function getDownloadInfo(id) {
  const document = documentRepository.findById(id);
  if (!document) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  const filePath = resolveStoragePath(document.storedName);
  try {
    await fs.access(filePath);
  } catch (err) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Arquivo do documento não encontrado.');
  }

  return { filePath, originalName: document.originalName };
}

async function removeStoredFile(storedName) {
  try {
    await fs.unlink(resolveStoragePath(storedName));
  } catch (err) {
    // Falha ao limpar arquivo órfão não deve mascarar o erro original.
  }
}

module.exports = { uploadDocument, listDocuments, getDownloadInfo };
