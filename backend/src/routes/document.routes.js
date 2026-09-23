// Rotas de documentos: define os endpoints, configura o multer na borda HTTP e delega ao controller.

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/document.controller');
const AppError = require('../errors/app-error');
const { STORAGE_DIR, MAX_FILE_SIZE, ensureStorageDir } = require('../config/storage');

ensureStorageDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
    const storedName = `${crypto.randomUUID()}${safeExtension}`;
    cb(null, storedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 2,
    fieldSize: 1024,
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      return next(err);
    }

    return next(new AppError(500, 'STORAGE_WRITE_FAILED', 'Falha ao gravar o documento.'));
  });
}

const router = express.Router();

router.post('/upload', handleUpload, documentController.uploadDocument);
router.get('/documents', documentController.listDocuments);
router.get('/documents/:id/download', documentController.downloadDocument);

module.exports = router;
