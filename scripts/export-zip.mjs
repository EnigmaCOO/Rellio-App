#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

const OUTPUT_DIR = 'dist';
const OUTPUT_FILE = 'rellio-starter.zip';
const ROOT_DIR = process.cwd();

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.DS_Store',
  'Thumbs.db',
];

async function shouldExclude(filePath) {
  const relativePath = relative(ROOT_DIR, filePath);
  return EXCLUDE_PATTERNS.some(pattern => {
    return relativePath.includes(pattern) || relativePath.startsWith(pattern);
  });
}

async function* walkDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (await shouldExclude(fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      yield* walkDirectory(fullPath);
    } else {
      yield fullPath;
    }
  }
}

async function createZipArchive() {
  try {
    // Ensure dist directory exists
    try {
      await mkdir(OUTPUT_DIR, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
    
    const outputPath = join(OUTPUT_DIR, OUTPUT_FILE);
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    console.log('🗜️  Creating Rellio starter ZIP archive...');
    console.log(`📁 Source: ${ROOT_DIR}`);
    console.log(`📦 Output: ${outputPath}\n`);
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    let fileCount = 0;
    
    // Add files to archive
    for await (const filePath of walkDirectory(ROOT_DIR)) {
      const relativePath = relative(ROOT_DIR, filePath);
      archive.file(filePath, { name: relativePath });
      fileCount++;
      
      if (fileCount % 50 === 0) {
        console.log(`  Added ${fileCount} files...`);
      }
    }
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });
    
    const stats = await stat(outputPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n✅ Successfully created ZIP archive`);
    console.log(`📊 Total files: ${fileCount}`);
    console.log(`💾 Archive size: ${sizeInMB} MB`);
    console.log(`📍 Location: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error creating ZIP archive:', error);
    process.exit(1);
  }
}

// Run the export
createZipArchive();
