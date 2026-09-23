import DownloadButton from './DownloadButton';

function formatFileSize(size) {
  if (!Number.isFinite(size)) {
    return '-';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(uploadedAt) {
  if (!uploadedAt) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(uploadedAt));
}

export default function DocumentList({ documents, isLoading }) {
  if (isLoading) {
    return <p className="empty-state">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="document-table-wrapper">
      <table className="document-table">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Dono</th>
            <th>Tamanho</th>
            <th>Enviado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>{document.originalName}</td>
              <td>{document.owner}</td>
              <td>{formatFileSize(document.size)}</td>
              <td>{formatUploadDate(document.uploadedAt)}</td>
              <td>
                <DownloadButton document={document} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}