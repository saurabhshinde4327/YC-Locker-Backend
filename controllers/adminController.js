const User = require('../models/user');
const Document = require('../models/document');
const fs = require('fs');
const path = require('path');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Error fetching documents' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Find all documents of the user
    const documents = await Document.find({ studentId: user.studentId });

    // Delete all document files
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    }

    // Delete user's upload directory if it exists
    const userUploadDir = path.join(process.env.UPLOADS_DIR, user.studentId);
    if (fs.existsSync(userUploadDir)) {
      fs.rmSync(userUploadDir, { recursive: true, force: true });
    }

    // Delete all documents from database
    await Document.deleteMany({ studentId: user.studentId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User and all associated documents deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

const uploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    let students = [];

    // Process different file types
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // For Excel files, we'll need to implement Excel parsing
      // For now, return a placeholder response
      return res.status(501).json({ error: 'Excel file processing not yet implemented. Please use CSV format.' });
    } else if (fileExtension === '.csv') {
      // Parse CSV file
      const csvContent = file.buffer.toString('utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['name', 'email', 'phone', 'studentid', 'department'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          error: `Missing required headers: ${missingHeaders.join(', ')}` 
        });
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          const student = {
            name: values[headers.indexOf('name')],
            email: values[headers.indexOf('email')],
            phone: values[headers.indexOf('phone')],
            studentId: values[headers.indexOf('studentid')],
            department: values[headers.indexOf('department')],
            password: 'defaultpassword123', // Default password
            role: 'student'
          };
          students.push(student);
        }
      }
    } else if (fileExtension === '.pdf') {
      // For PDF files, we'll need to implement PDF parsing
      // For now, return a placeholder response
      return res.status(501).json({ error: 'PDF file processing not yet implemented. Please use CSV format.' });
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please use Excel, CSV, or PDF files.' });
    }

    if (students.length === 0) {
      return res.status(400).json({ error: 'No valid student data found in the file' });
    }

    // Validate and create students
    const createdStudents = [];
    const errors = [];

    for (const student of students) {
      try {
        // Check if student already exists
        const existingUser = await User.findOne({ 
          $or: [{ email: student.email }, { studentId: student.studentId }] 
        });

        if (existingUser) {
          errors.push(`Student with email ${student.email} or ID ${student.studentId} already exists`);
          continue;
        }

        // Create new user
        const newUser = new User(student);
        await newUser.save();
        createdStudents.push(newUser);
      } catch (error) {
        errors.push(`Error creating student ${student.name}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({
      message: `Successfully created ${createdStudents.length} students`,
      created: createdStudents.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error uploading students:', error);
    res.status(500).json({ error: 'Error processing file upload' });
  }
};

module.exports = { getAllUsers, getAllDocuments, deleteUser, uploadStudents };