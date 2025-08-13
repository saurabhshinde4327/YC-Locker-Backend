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

    const { fileTypeFromFile } = await import('file-type');
    const filePath = path.join(process.env.UPLOADS_DIR, req.user.studentId, req.file.filename);
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
    next();
  } catch (error) {
    console.error('File validation error:', error.message);
    res.status(500).json({ error: 'Error validating file', details: error.message });
  }
};

module.exports = validateFile;