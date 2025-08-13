const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  studentId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { 
    type: String, 
    required: true,
    enum: [
      'botany',
      'chemistry',
      'electronics',
      'english',
      'mathematics',
      'microbiology',
      'sports',
      'statistics',
      'zoology',
      'animation-science',
      'data-science',
      'artificial-intelligence',
      'bvoc-software-development',
      'bioinformatics',
      'computer-application',
      'computer-science-entire',
      'computer-science-optional',
      'drug-chemistry',
      'food-technology',
      'forensic-science',
      'nanoscience-and-technology',
      'fishery',
      'military-science',
      'physics',
      'music-science',
      'plant-protection',
      'seed-technology',
      'instrumentation'
    ]
  },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  storageUsed: { type: Number, default: 0 },
  photoPath: { type: String },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);