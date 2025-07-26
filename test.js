const fs = require('fs');
const path = require('path');

// Define folders to create
const folders = [
  'config',
  'models',
  'routes',
  'middleware',
  'controllers',
  'uploads',
  'utils'
];

// Create each folder if it doesn’t exist
folders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Created folder: ${folderPath}`);
  } else {
    console.log(`Folder already exists: ${folderPath}`);
  }
});

// Note: ./uploads/<studentId> folders will be created dynamically on first upload
console.log('Folder structure setup complete!');