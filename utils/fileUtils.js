const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Dynamic storage setup
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    // Use default uploads directory if UPLOADS_DIR is not set
    const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
    const uploadPath = path.join(uploadsDir, req.user.studentId);
    
    // Create student folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit, also checked in middleware
});

module.exports = { upload };