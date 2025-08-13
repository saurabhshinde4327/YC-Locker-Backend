const User = require('../models/user');
const Document = require('../models/document');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Get all users (excluding passwords)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

// Get all documents
const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

// Delete a user and their documents
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (req.user && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const documents = await Document.find({ studentId: user.studentId });

    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        try {
          fs.unlinkSync(doc.filePath);
        } catch (err) {
          console.error(`Failed to delete file ${doc.filePath}:`, err);
        }
      }
    }

    const userUploadDir = path.join(process.env.UPLOADS_DIR || 'C:/temp/Uploads', user.studentId);
    if (fs.existsSync(userUploadDir)) {
      try {
        fs.rmSync(userUploadDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to delete directory ${userUploadDir}:`, err);
      }
    }

    await Document.deleteMany({ studentId: user.studentId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and documents deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

// Upload students from CSV or Excel
const uploadStudents = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Unsupported file type. Use CSV or Excel.' });
    }

    let students = [];
    const requiredHeaders = ['name', 'email', 'phone', 'studentid', 'department'];

    // Parse CSV
    if (ext === '.csv') {
      const csv = fs.readFileSync(file.path, 'utf-8');
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: `Missing headers: ${missing.join(', ')}` });
      }

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length !== headers.length) continue;

        let departmentRaw = row[headers.indexOf('department')].toLowerCase().replace(/\s+/g, '-');
        
        // Handle special department names
        if (departmentRaw === 'b.voc-software-development') {
          departmentRaw = 'bvoc-software-development';
        } else if (departmentRaw === 'fishery') {
          departmentRaw = 'fishery';
        }

        const student = {
          name: row[headers.indexOf('name')],
          email: row[headers.indexOf('email')],
          phone: row[headers.indexOf('phone')],
          studentId: row[headers.indexOf('studentid')],
          department: departmentRaw,
          password: 'student',
          role: 'student'
        };
        students.push(student);
      }

    } else {
      // Parse Excel
      const workbook = XLSX.readFile(file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = data[0].map(h => h.toString().trim().toLowerCase());

      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: `Missing headers: ${missing.join(', ')}` });
      }

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < headers.length) continue;

        const values = row.map(v => v ? v.toString().trim() : '');
        let departmentRaw = values[headers.indexOf('department')].toLowerCase().replace(/\s+/g, '-');
        
        // Handle special department names
        if (departmentRaw === 'b.voc-software-development') {
          departmentRaw = 'bvoc-software-development';
        } else if (departmentRaw === 'fishery') {
          departmentRaw = 'fishery';
        }

        const student = {
          name: values[headers.indexOf('name')],
          email: values[headers.indexOf('email')],
          phone: values[headers.indexOf('phone')],
          studentId: values[headers.indexOf('studentid')],
          department: departmentRaw,
          password: 'student',
          role: 'student'
        };
        students.push(student);
      }
    }

    fs.unlinkSync(file.path); // Clean up

    if (!students.length) return res.status(400).json({ error: 'No valid student records found.' });

    const created = [];
    const errors = [];

    for (const student of students) {
      try {
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email);
        if (!validEmail) {
          errors.push(`Invalid email for ${student.name}`);
          continue;
        }

        const exists = await User.findOne({ $or: [{ email: student.email }, { studentId: student.studentId }] });
        if (exists) {
          errors.push(`Student with email or ID ${student.email} already exists`);
          continue;
        }

        const user = new User(student);
        await user.save();
        created.push(user);
      } catch (err) {
        errors.push(`Error creating ${student.name}: ${err.message}`);
      }
    }

    res.json({
      message: `Created ${created.length} students.`,
      created: created.length,
      errors: errors.length ? errors : undefined,
    });

  } catch (err) {
    console.error('Upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed. Try again.' });
  }
};

module.exports = {
  getAllUsers,
  getAllDocuments,
  deleteUser,
  uploadStudents,
};
