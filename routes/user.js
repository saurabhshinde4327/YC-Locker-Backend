const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/user');
const { upload } = require('../utils/fileUtils');
const path = require('path');
const fs = require('fs');

router.patch('/profile', auth, upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      user.email = email;
    }

    if (req.file) {
      if (user.photoPath) {
        fs.unlinkSync(user.photoPath);
      }
      user.photoPath = path.join(process.env.UPLOADS_DIR, req.user.studentId, req.file.filename);
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

module.exports = router;