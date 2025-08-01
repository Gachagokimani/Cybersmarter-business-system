#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking for common linting issues...\n');

// Check if eslint-plugin-react-hooks is installed
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasReactHooks = packageJson.devDependencies && packageJson.devDependencies['eslint-plugin-react-hooks'];

if (!hasReactHooks) {
  console.log('❌ eslint-plugin-react-hooks is missing from devDependencies');
  console.log('   Run: pnpm add -D eslint-plugin-react-hooks');
} else {
  console.log('✅ eslint-plugin-react-hooks is installed');
}

// Check for common import issues
const apiDir = path.join(__dirname, '../app/api');
if (fs.existsSync(apiDir)) {
  console.log('\n📁 Checking API routes...');
  
  const files = fs.readdirSync(apiDir, { recursive: true });
  files.forEach(file => {
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(path.join(apiDir, file), 'utf8');
      
      // Check for NextRequest import
      if (content.includes('NextRequest') && !content.includes("import.*NextRequest")) {
        console.log(`⚠️  ${file}: NextRequest used but import might be missing`);
      }
      
      // Check for proper export signatures
      if (content.includes('export async function DELETE')) {
        if (!content.includes('request: Request') && !content.includes('request: NextRequest')) {
          console.log(`⚠️  ${file}: DELETE function might have incorrect signature`);
        }
      }
    }
  });
}

console.log('\n🎯 To fix linting issues:');
console.log('1. Run: pnpm install');
console.log('2. Run: pnpm lint');
console.log('3. Fix any errors shown above');
console.log('4. Run: pnpm build');