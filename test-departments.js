// Test script for department normalization
const { normalizeDepartment } = require('./controllers/adminController');

// Test cases for problematic departments
const testDepartments = [
  'BVOC',
  'B.Voc',
  'B.Voc Software Development',
  'b.voc-software-development',
  'bvoc-software-development',
  'Fishery',
  'Fisheries',
  'fishery',
  'Plant Protection',
  'Plant Protection Science',
  'plant-protection',
  'plantprotection',
  'Physics',
  'Physical Science',
  'physics',
  'physical-science'
];

console.log('Testing department normalization...\n');

testDepartments.forEach(dept => {
  const normalized = normalizeDepartment(dept);
  console.log(`"${dept}" -> "${normalized}"`);
});

console.log('\nValid departments:');
const validDepartments = [
  'botany', 'chemistry', 'electronics', 'english', 'mathematics', 'microbiology',
  'sports', 'statistics', 'zoology', 'animation-science', 'data-science',
  'artificial-intelligence', 'bvoc-software-development', 'bioinformatics',
  'computer-application', 'computer-science-entire', 'computer-science-optional',
  'drug-chemistry', 'food-technology', 'forensic-science', 'nanoscience-and-technology',
  'fishery', 'military-science', 'physics', 'music-science', 'plant-protection',
  'seed-technology', 'instrumentation'
];

validDepartments.forEach(dept => {
  console.log(`- ${dept}`);
});
