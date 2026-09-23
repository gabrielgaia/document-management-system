import { useEffect, useState } from 'react';
import './App.css';
import DocumentList from './components/DocumentList';
import UploadComponent from './components/UploadComponent';
import { listDocuments } from './services/documentApi';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDocuments() {
    try {
      setIsLoading(true);
      setError('');
      const loadedDocuments = await listDocuments();
      setDocuments(loadedDocuments);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  function handleDocumentUploaded(document) {
    setDocuments((currentDocuments) => [document, ...currentDocuments]);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Document Management System</h1>
        <p>Envie documentos, acompanhe os metadados registrados e baixe os arquivos armazenados localmente.</p>
      </header>

      <div className="content-grid">
        <section className="panel" aria-labelledby="upload-title">
          <h2 id="upload-title">Novo documento</h2>
          <UploadComponent onDocumentUploaded={handleDocumentUploaded} />
        </section>

        <section className="panel" aria-labelledby="documents-title">
          <h2 id="documents-title">Documentos</h2>
          {error && <p className="feedback feedback-error">{error}</p>}
          {!error && <DocumentList documents={documents} isLoading={isLoading} />}
        </section>
      </div>
    </main>
  );
}
