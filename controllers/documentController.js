const Document = require('../models/document');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

// Upload File
const uploadFile = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;
    
    // Extract file type from file mimetype or extension
    let fileType = 'unknown';
    if (file.mimetype) {
      if (file.mimetype.includes('pdf')) {
        fileType = 'pdf';
      } else if (file.mimetype.includes('image')) {
        fileType = 'image';
      } else if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
        fileType = 'word';
      } else if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
        fileType = 'excel';
      } else if (file.mimetype.includes('text')) {
        fileType = 'text';
      }
    } else {
      // Fallback: extract from filename extension
      const ext = path.extname(file.originalname || file.filename).toLowerCase();
      if (ext === '.pdf') fileType = 'pdf';
      else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) fileType = 'image';
      else if (['.doc', '.docx'].includes(ext)) fileType = 'word';
      else if (['.xls', '.xlsx'].includes(ext)) fileType = 'excel';
      else if (['.txt'].includes(ext)) fileType = 'text';
    }

    const document = new Document({
      studentId: user.studentId,
      fileName: file.filename,
      filePath: path.join(process.env.UPLOADS_DIR || 'uploads', user.studentId, file.filename),
      fileSize: file.size,
      fileType: fileType,
      category: req.body.category,
    });
    await document.save();

    // Update user storage usage
    const oldStorageUsed = user.storageUsed;
    user.storageUsed += file.size;
    await user.save();
    
    console.log(`User ${user.studentId} storage updated: ${oldStorageUsed} -> ${user.storageUsed} (+${file.size})`);

    res.status(201).json({ 
      message: 'File uploaded successfully', 
      document,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        storageUsed: user.storageUsed
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload error' });
  }
};

// Get All Documents
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.user.studentId });
    
    // Get updated user data with current storage usage
    const user = await User.findById(req.user._id).select('-password');
    
    // Calculate total storage used from documents
    const totalStorageUsed = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
    
    // Update user's storage usage if it differs (with better error handling)
    if (user.storageUsed !== totalStorageUsed) {
      try {
        user.storageUsed = totalStorageUsed;
        await user.save();
        console.log(`Updated user ${user.studentId} storage from ${user.storageUsed} to ${totalStorageUsed}`);
      } catch (saveError) {
        console.error('Error saving user storage update:', saveError);
        // Continue with the response even if save fails
      }
    }
    
    res.json({
      documents,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        studentId: user.studentId,
        department: user.department,
        role: user.role,
        storageUsed: user.storageUsed
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

// Function to recalculate and sync user storage
const recalculateUserStorage = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    
    const documents = await Document.find({ studentId: user.studentId });
    const totalStorageUsed = documents.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
    
    if (user.storageUsed !== totalStorageUsed) {
      user.storageUsed = totalStorageUsed;
      await user.save();
      console.log(`Recalculated user ${user.studentId} storage: ${totalStorageUsed}`);
    }
    
    return user;
  } catch (error) {
    console.error('Error recalculating user storage:', error);
    return null;
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

    // Update user storage usage
    const oldStorageUsed = req.user.storageUsed;
    req.user.storageUsed -= document.fileSize;
    await req.user.save();
    
    console.log(`User ${req.user.studentId} storage updated after delete: ${oldStorageUsed} -> ${req.user.storageUsed} (-${document.fileSize})`);

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
  recalculateUserStorage,
};
