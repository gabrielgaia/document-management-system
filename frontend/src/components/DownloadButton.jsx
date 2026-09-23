import { getDocumentDownloadUrl } from '../services/documentApi';

export default function DownloadButton({ document }) {
  return (
    <a className="download-button" href={getDocumentDownloadUrl(document.id)}>
      Baixar
    </a>
  );
}