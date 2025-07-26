const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, isSuperAdmin } = require('../middleware/auth');
const { getAllUsers, getAllDocuments, deleteUser, uploadStudents } = require('../controllers/adminController');
const { exec } = require('child_process');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel, CSV, and PDF files are allowed.'), false);
    }
  }
});

router.get('/users', auth, isSuperAdmin, getAllUsers);
router.get('/documents', auth, isSuperAdmin, getAllDocuments);
router.delete('/users/:userId', auth, isSuperAdmin, deleteUser);
router.post('/upload-students', auth, isSuperAdmin, upload.single('file'), uploadStudents);

// Download template route
router.get('/download-template', auth, isSuperAdmin, (req, res) => {
  const templatePath = path.join(__dirname, '../uploads/temp/student_template.csv');
  res.download(templatePath, 'student_template.csv');
});

// Test route to check environment variables
router.get('/test-env', auth, isSuperAdmin, (req, res) => {
  console.log('Environment check - MONGODB_URI:', process.env.MONGODB_URI);
  res.json({ 
    mongoUri: process.env.MONGODB_URI,
    hasMongoUri: !!process.env.MONGODB_URI
  });
});

// Backup database route
router.post('/backup-db', auth, isSuperAdmin, async (req, res) => {
  console.log('Backup request received');
  
  try {
    // Set backup file path
    const backupDir = 'backups';
    if (!fs.existsSync(backupDir)) {
      console.log('Creating backups directory');
      fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${backupDir}/data-backup-${timestamp}.json`;
    console.log('Backup file path:', backupFile);

    // Get data from database
    const User = require('../models/user');
    const Document = require('../models/document');
    
    const users = await User.find({}, '-password');
    const documents = await Document.find();
    
    // Create backup data object
    const backupData = {
      timestamp: new Date().toISOString(),
      users: users,
      documents: documents,
      totalUsers: users.length,
      totalDocuments: documents.length
    };
    
    // Write to file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log('Backup completed successfully');
    console.log('Backup file created at:', backupFile);
    console.log('File exists after creation:', fs.existsSync(backupFile));
    
    // Check file size
    const stats = fs.statSync(backupFile);
    console.log('Backup file size:', stats.size, 'bytes');
    
    // Return download URL with just the filename
    const filename = path.basename(backupFile);
    const downloadUrl = `/api/admin/download-backup?file=${encodeURIComponent(filename)}`;
    console.log('Download URL:', downloadUrl);
    
    res.json({ 
      message: 'Backup completed successfully',
      downloadUrl: downloadUrl,
      stats: {
        users: users.length,
        documents: documents.length
      }
    });
    
  } catch (err) {
    console.error('Backup route error:', err);
    res.status(500).json({ error: 'Backup failed', details: err.message });
  }
});

// Download backup file route
router.get('/download-backup', auth, isSuperAdmin, (req, res) => {
  const file = req.query.file;
  console.log('Download request for file:', file);
  
  if (!file) {
    console.log('No file parameter provided');
    return res.status(400).json({ error: 'File parameter is required' });
  }
  
  try {
    // Get the absolute path to the backups directory
    const backupDir = path.join(__dirname, '..', 'backups');
    const requestedFile = path.join(backupDir, file);
    
    console.log('Current directory:', __dirname);
    console.log('Backup directory:', backupDir);
    console.log('Requested file:', requestedFile);
    console.log('File exists:', fs.existsSync(requestedFile));
    
    // List files in backup directory for debugging
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      console.log('Files in backup directory:', files);
    } else {
      console.log('Backup directory does not exist');
    }
    
    if (!fs.existsSync(requestedFile)) {
      console.log('File not found:', requestedFile);
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    console.log('Serving file:', requestedFile);
    
    // Get file stats
    const stats = fs.statSync(requestedFile);
    console.log('File size:', stats.size, 'bytes');
    
    // Set proper headers for file download
    const filename = path.basename(requestedFile);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const fileStream = fs.createReadStream(requestedFile);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
    fileStream.pipe(res);
    
  } catch (err) {
    console.error('Download route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed', details: err.message });
    }
  }
});

module.exports = router;