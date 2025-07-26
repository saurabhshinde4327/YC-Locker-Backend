const express = require('express');
const router = express.Router();
const { register, login, adminLogin } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const User = require('../models/user');

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error fetching user' });
  }
});

module.exports = router;