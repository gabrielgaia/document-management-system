import { useState } from 'react';
import { uploadDocument } from '../services/documentApi';

export default function UploadComponent({ onDocumentUploaded }) {
  const [file, setFile] = useState(null);
  const [owner, setOwner] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    try {
      setIsUploading(true);
      const uploadedDocument = await uploadDocument({ file, owner: owner.trim() });
      onDocumentUploaded(uploadedDocument);
      setFile(null);
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="owner">Usuário</label>
        <input
          id="owner"
          name="owner"
          type="text"
          placeholder="anonymous"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="file">Documento</label>
        <input id="file" name="file" type="file" onChange={(event) => setFile(event.target.files[0] || null)} />
      </div>

      {error && <p className="feedback feedback-error">{error}</p>}

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}