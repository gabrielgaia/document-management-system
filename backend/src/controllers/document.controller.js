// Controllers de documentos: leem a requisição, chamam o service e traduzem o resultado para HTTP.

const documentService = require('../services/document.service');
const AppError = require('../errors/app-error');

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'O campo "file" é obrigatório.');
    }

    const owner = req.get('X-User-Id') || 'anonymous';
    const document = await documentService.uploadDocument({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      owner,
    });

    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const documents = await documentService.listDocuments();
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
}

async function downloadDocument(req, res, next) {
  try {
    const { id } = req.params;
    const { filePath, originalName } = await documentService.getDownloadInfo(id);

    res.download(filePath, originalName, (err) => {
      if (err && !res.headersSent) {
        next(new AppError(500, 'STORAGE_READ_FAILED', 'Falha ao ler o documento.'));
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadDocument, listDocuments, downloadDocument };
