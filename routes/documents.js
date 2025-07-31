const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const validateFile = require('../middleware/fileValidation');
const checkStorageLimit = require('../middleware/storageLimit');
const { upload } = require('../utils/fileUtils');
const { uploadFile, getDocuments, searchDocuments, deleteDocument, toggleFavorite } = require('../controllers/documentController');
const Document = require('../models/document');
const path = require('path');
const fs = require('fs');

router.post('/upload', auth, upload.single('file'), validateFile, checkStorageLimit, uploadFile);
router.get('/', auth, getDocuments);
router.get('/search', auth, searchDocuments); // Fixed: Added auth middleware
router.delete('/:id', auth, deleteDocument);
router.patch('/:id/favorite', auth, toggleFavorite);

router.get('/view/:id', auth, async (req, res) => {
  try {
    console.log(`View document: ID=${req.params.id}, User studentId=${req.user.studentId}`);
    const document = await Document.findById(req.params.id);
    if (!document) {
      console.error(`Document not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    if (document.studentId !== req.user.studentId) {
      console.error(`Unauthorized: Document studentId=${document.studentId}, User studentId=${req.user.studentId}`);
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!fs.existsSync(document.filePath)) {
      console.error(`File not found: ${document.filePath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    console.log(`Serving document: ID=${req.params.id}, fileName=${document.fileName}, fileType=${document.fileType}, filePath=${document.filePath}`);

    const ext = path.extname(document.fileName).toLowerCase();
    let contentType;
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        if (document.fileType === 'pdf') {
          contentType = 'application/pdf';
        } else if (document.fileType === 'word') {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else {
          contentType = `image/${document.fileType}`;
        }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);

    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error(`Error serving file: ${error.message}`);
    res.status(500).json({ error: 'Error serving file' });
  }
});

router.get('/download/:id', auth, async (req, res) => {
  try {
    console.log(`Download document: ID=${req.params.id}, User studentId=${req.user.studentId}`);
    const document = await Document.findById(req.params.id);
    if (!document) {
      console.error(`Document not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Document not found' });
    }
    if (document.studentId !== req.user.studentId) {
      console.error(`Unauthorized: Document studentId=${document.studentId}, User studentId=${req.user.studentId}`);
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!fs.existsSync(document.filePath)) {
      console.error(`File not found: ${document.filePath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    const ext = path.extname(document.fileName).toLowerCase();
    let contentType;
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        if (document.fileType === 'pdf') {
          contentType = 'application/pdf';
        } else if (document.fileType === 'word') {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else {
          contentType = `image/${document.fileType}`;
        }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);

    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

module.exports = router;