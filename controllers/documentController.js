const Document = require('../models/document');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

// Upload File
const uploadFile = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;
    const fileType = req.fileType;

    const document = new Document({
      studentId: user.studentId,
      fileName: file.filename,
      filePath: path.join(process.env.UPLOADS_DIR, user.studentId, file.filename),
      fileSize: file.size,
      fileType: fileType,
      category: req.body.category,
    });
    await document.save();

    user.storageUsed += file.size;
    await user.save();

    res.status(201).json({ message: 'File uploaded successfully', document });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload error' });
  }
};

// Get All Documents
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.user.studentId });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

// Search Documents
const searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;
    const documents = await Document.find({
      studentId: req.user.studentId,
      fileName: { $regex: query, $options: 'i' },
    });
    res.json(documents);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Error searching documents' });
  }
};

// Delete Document
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    fs.unlinkSync(document.filePath);
    await Document.deleteOne({ _id: req.params.id });

    req.user.storageUsed -= document.fileSize;
    await req.user.save();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Error deleting document' });
  }
};

// Toggle Favorite
const toggleFavorite = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    document.isFavorite = !document.isFavorite;
    await document.save();
    res.json({ message: 'Favorite status updated', document });
  } catch (error) {
    console.error('Error updating favorite status:', error);
    res.status(500).json({ error: 'Error updating favorite status' });
  }
};

// Download Document
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.studentId !== req.user.studentId) {
      return res.status(404).json({ error: 'Document not found or not authorized' });
    }

    const filePath = document.filePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, document.fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Error downloading document' });
  }
};

module.exports = {
  uploadFile,
  getDocuments,
  searchDocuments,
  deleteDocument,
  toggleFavorite,
  downloadDocument,
};
