const path = require('path');

const validateFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }

    // Use a default uploads directory if UPLOADS_DIR is not set
    const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
    const filePath = path.join(uploadsDir, req.user.studentId, req.file.filename);
    
    try {
      const { fileTypeFromFile } = await import('file-type');
      const fileType = await fileTypeFromFile(filePath);
      const allowedTypes = [
        'image/png', 
        'image/jpeg', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!fileType || !allowedTypes.includes(fileType.mime)) {
        return res.status(400).json({ error: 'Only PNG, JPEG, PDF, Word (.doc, .docx), and Excel (.xls, .xlsx) files are allowed' });
      }

      if (fileType.mime === 'application/pdf') {
        req.fileType = 'pdf';
      } else if (fileType.mime === 'application/msword' || fileType.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        req.fileType = 'word';
      } else if (fileType.mime === 'application/vnd.ms-excel' || fileType.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        req.fileType = 'excel';
      } else if (fileType.mime && fileType.mime.startsWith('image/')) {
        req.fileType = 'image';
      }
    } catch (fileTypeError) {
      // Fallback: determine file type from mimetype or extension
      if (req.file.mimetype) {
        if (req.file.mimetype.includes('pdf')) {
          req.fileType = 'pdf';
        } else if (req.file.mimetype.includes('image')) {
          req.fileType = 'image';
        } else if (req.file.mimetype.includes('word') || req.file.mimetype.includes('document')) {
          req.fileType = 'word';
        } else if (req.file.mimetype.includes('excel') || req.file.mimetype.includes('spreadsheet')) {
          req.fileType = 'excel';
        } else {
          req.fileType = 'unknown';
        }
      } else {
        // Fallback: extract from filename extension
        const ext = path.extname(req.file.originalname || req.file.filename).toLowerCase();
        if (ext === '.pdf') req.fileType = 'pdf';
        else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) req.fileType = 'image';
        else if (['.doc', '.docx'].includes(ext)) req.fileType = 'word';
        else if (['.xls', '.xlsx'].includes(ext)) req.fileType = 'excel';
        else req.fileType = 'unknown';
      }
    }
    
    next();
  } catch (error) {
    console.error('File validation error:', error.message);
    res.status(500).json({ error: 'Error validating file', details: error.message });
  }
};

module.exports = validateFile;