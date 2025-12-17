// Script to update all hardcoded API URLs to use centralized config
// Run with: node update-api-urls.js

const fs = require('fs');
const path = require('path');

const API_URL_PATTERN = /http:\/\/192\.168\.1\.44:4000/g;
const PAGES_DIR = path.join(__dirname, 'src', 'pages');

// Files to exclude (AdminBiometric has its own device config)
const EXCLUDE_FILES = ['AdminBiometric.jsx'];

function updateFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Skip excluded files
  if (EXCLUDE_FILES.includes(fileName)) {
    console.log(`⏭️  Skipping ${fileName} (excluded)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file already imports API_URL
  const hasApiImport = content.includes("import { API_URL") || content.includes("import API_URL") || content.includes("from '../config/api'") || content.includes("from '../utils/api'");
  
  // Add import if not present and file uses hardcoded URL
  if (!hasApiImport && API_URL_PATTERN.test(content)) {
    // Find the last import statement
    const importMatch = content.match(/^import .+ from .+$/gm);
    if (importMatch && importMatch.length > 0) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = content.indexOf('\n', lastImportIndex) + 1;
      
      // Check if file uses getFileUrl (for image URLs)
      const needsFileUrl = /http:\/\/192\.168\.1\.44:4000\$\{/.test(content) || /http:\/\/192\.168\.1\.44:4000\$/.test(content);
      
      if (needsFileUrl) {
        content = content.slice(0, insertIndex) + 
                  "import { API_URL, getFileUrl } from '../config/api'\n" + 
                  content.slice(insertIndex);
      } else {
        content = content.slice(0, insertIndex) + 
                  "import { API_URL } from '../config/api'\n" + 
                  content.slice(insertIndex);
      }
      modified = true;
    }
  }

  // Replace hardcoded URLs in API calls
  content = content.replace(/http:\/\/192\.168\.1\.44:4000\/api\//g, `${API_URL}/api/`);
  if (content.includes('http://192.168.1.44:4000/api')) {
    modified = true;
  }

  // Replace hardcoded URLs in template literals for images/files
  // Pattern: `http://192.168.1.44:4000${path}` -> getFileUrl(path)
  content = content.replace(/`http:\/\/192\.168\.1\.44:4000\$\{([^}]+)\}`/g, 'getFileUrl($1)');
  if (content.includes('getFileUrl(')) {
    modified = true;
  }

  // Replace hardcoded URLs in string concatenation for images/files
  // Pattern: `http://192.168.1.44:4000${path}` -> getFileUrl(path)
  content = content.replace(/"http:\/\/192\.168\.1\.44:4000"\s*\+\s*([^;]+)/g, 'getFileUrl($1)');
  
  // Replace remaining hardcoded URLs
  const remainingMatches = content.match(API_URL_PATTERN);
  if (remainingMatches) {
    content = content.replace(API_URL_PATTERN, '${API_URL}');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${fileName}`);
  } else {
    console.log(`⏭️  No changes needed for ${fileName}`);
  }
}

// Get all JSX files in pages directory
const files = fs.readdirSync(PAGES_DIR)
  .filter(file => file.endsWith('.jsx'))
  .map(file => path.join(PAGES_DIR, file));

console.log('🔄 Updating API URLs in pages...\n');

files.forEach(updateFile);

console.log('\n✨ Done!');

