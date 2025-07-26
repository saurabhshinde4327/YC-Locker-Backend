const User = require('../models/user');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);
    const { name, phone, email, studentId, password, department } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or Student ID already exists' });
    }

    const user = new User({ name, phone, email, studentId, password, department });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    res.status(201).json({ 
      token, 
      user: { 
        _id: user._id, 
        name, 
        email, 
        studentId, 
        department,
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { studentId: identifier }],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, studentId: user.studentId, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, studentId: user.studentId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Standardized to 1 day
    );
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, studentId: user.studentId, role: user.role } });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
};

module.exports = { register, login, adminLogin };