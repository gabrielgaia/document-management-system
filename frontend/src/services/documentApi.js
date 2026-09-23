const API_BASE_URL = '/api';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Não foi possível concluir a operação.');
  }

  return data;
}

export async function uploadDocument({ file, owner }) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = owner ? { 'X-User-Id': owner } : undefined;
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return parseResponse(response);
}

export async function listDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`);
  const data = await parseResponse(response);
  return data.documents || [];
}

export function getDocumentDownloadUrl(documentId) {
  return `${API_BASE_URL}/documents/${documentId}/download`;
}