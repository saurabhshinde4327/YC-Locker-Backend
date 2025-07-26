const User = require('../models/user');

const checkStorageLimit = async (req, res, next) => {
  try {
    const user = req.user;
    const maxStorage = 1_073_741_824;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const newFileSize = req.file.size;
    if (user.storageUsed + newFileSize > maxStorage) {
      return res.status(400).json({ error: 'Storage limit of 1GB exceeded' });
    }
    next();
  } catch (error) {
    console.error('Storage limit error:', error);
    res.status(500).json({ error: 'Error checking storage limit' });
  }
};

module.exports = checkStorageLimit;