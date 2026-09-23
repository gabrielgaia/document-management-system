// Rotas de documentos: define os endpoints, configura o multer na borda HTTP e delega ao controller.

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/document.controller');
const { STORAGE_DIR, MAX_FILE_SIZE, ensureStorageDir } = require('../config/storage');

ensureStorageDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  // Nome físico gerado pelo sistema, sem depender do nome original enviado pelo cliente.
  filename: (req, file, cb) => {
    const storedName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, storedName);
  },
});

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

const router = express.Router();

router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/documents', documentController.listDocuments);
router.get('/documents/:id/download', documentController.downloadDocument);

module.exports = router;
