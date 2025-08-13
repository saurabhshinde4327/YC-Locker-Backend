const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const { auth, isSuperAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getAllDocuments,
  deleteUser,
  uploadStudents
} = require('../controllers/adminController');
const User = require('../models/user');

// Configure multer for file uploads (do this BEFORE using it!)
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
    fileSize: 10 * 1024 * 1024 // 10MB
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
      cb(new Error('Invalid file type. Only Excel, CSV, and PDF files are allowed.'));
    }
  }
});

// 🛠 DO NOT register the same route twice
router.post('/upload-students', auth, isSuperAdmin, upload.single('file'), uploadStudents);

router.get('/users', auth, isSuperAdmin, getAllUsers);
router.get('/documents', auth, isSuperAdmin, getAllDocuments);
router.delete('/users/:userId', auth, isSuperAdmin, deleteUser);

// Create individual user
router.post('/users', auth, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, phone, studentId, department } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !studentId || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or Student ID already exists' });
    }

    // Create new user with default password
    const user = new User({
      name,
      email,
      phone,
      studentId,
      department,
      password: phone, // Use phone number as default password
      role: 'student'
    });

    await user.save();

    // Return user data without password
    const { password: _, ...userData } = user.toObject();

    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Download student template
router.get('/download-template', auth, isSuperAdmin, (req, res) => {
  const templatePath = path.join(__dirname, '../uploads/temp/student_template.csv');
  res.download(templatePath, 'student_template.csv');
});

// Check env vars
router.get('/test-env', auth, isSuperAdmin, (req, res) => {
  res.json({ 
    mongoUri: process.env.MONGODB_URI,
    hasMongoUri: !!process.env.MONGODB_URI
  });
});

// Backup database
router.post('/backup-db', auth, isSuperAdmin, async (req, res) => {
  try {
    const backupDir = 'backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `${backupDir}/data-backup-${timestamp}.json`;

    const User = require('../models/user');
    const Document = require('../models/document');

    const users = await User.find({}, '-password');
    const documents = await Document.find();

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      documents,
      totalUsers: users.length,
      totalDocuments: documents.length
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    const filename = path.basename(backupFile);
    const downloadUrl = `/api/admin/download-backup?file=${encodeURIComponent(filename)}`;

    res.json({
      message: 'Backup completed successfully',
      downloadUrl,
      stats: {
        users: users.length,
        documents: documents.length
      }
    });
  } catch (err) {
    console.error('Backup failed:', err);
    res.status(500).json({ error: 'Backup failed', details: err.message });
  }
});

// Download backup
router.get('/download-backup', auth, isSuperAdmin, (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).json({ error: 'File parameter is required' });

  const backupDir = path.join(__dirname, '..', 'backups');
  const filePath = path.join(backupDir, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  const stats = fs.statSync(filePath);
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', stats.size);

  fs.createReadStream(filePath)
    .on('error', (err) => {
      console.error('Error reading backup file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    })
    .pipe(res);
});

// Reset user password by admin
router.post('/reset-password', auth, isSuperAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a new temporary password (8 characters with letters and numbers)
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const newPassword = generatePassword();
    
    // Update user's password
    user.password = newPassword;
    await user.save();

    res.json({ 
      message: 'Password reset successfully',
      newPassword: newPassword
    });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

module.exports = router;
