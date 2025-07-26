const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    trim: true,
    uppercase: true,
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
    trim: true,
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative'],
  },
  fileType: {
    type: String,
    enum: ['image', 'pdf', 'word'],
    required: [true, 'File type is required'],
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

documentSchema.index({ studentId: 1 });

module.exports = mongoose.model('Document', documentSchema);