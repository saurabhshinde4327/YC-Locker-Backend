const Document = require('../models/document');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

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
      category: req.body.category, // Save category
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

const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.user.studentId });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

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

module.exports = { uploadFile, getDocuments, searchDocuments, deleteDocument, toggleFavorite };