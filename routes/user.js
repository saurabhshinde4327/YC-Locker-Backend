const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/user');
const { upload } = require('../utils/fileUtils');
const path = require('path');
const fs = require('fs');

// Reset password endpoint
router.post('/reset-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Find the user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

router.patch('/profile', auth, upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update email
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      user.email = email;
    }

    // Handle profile photo
    if (req.file) {
      const newPhotoPath = path.resolve(process.env.UPLOADS_DIR, req.user.studentId, req.file.filename);

      // Delete old photo if exists
      if (user.photoPath && fs.existsSync(user.photoPath)) {
        fs.unlinkSync(user.photoPath);
      }

      user.photoPath = newPhotoPath;
    }

    await user.save();

    // Return clean user data (no password, no __v, etc.)
    const { password, __v, ...userData } = user.toObject();

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

module.exports = router;
