// Repositório de metadados de documentos, mantidos em memória durante a vida do processo.
// Não conhece Express nem detalhes de resposta HTTP.

const documents = [];

// Remove campos internos (storedName) antes de expor o metadado publicamente.
function toPublicMetadata(document) {
  const { storedName, ...publicFields } = document;
  return { ...publicFields };
}

function create(document) {
  documents.push({ ...document });
  return toPublicMetadata(document);
}

function list() {
  return documents
    .slice()
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .map(toPublicMetadata);
}

// Retorna o metadado completo (incluindo storedName), usado internamente pelo service.
function findById(id) {
  const document = documents.find((doc) => doc.id === id);
  return document ? { ...document } : undefined;
}

function remove(id) {
  const index = documents.findIndex((doc) => doc.id === id);
  if (index !== -1) {
    documents.splice(index, 1);
  }
}

function clear() {
  documents.length = 0;
}

module.exports = { create, list, findById, remove, clear };
