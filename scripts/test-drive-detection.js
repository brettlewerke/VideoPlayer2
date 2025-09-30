/**
 * Test script to debug drive detection and folder scanning
 * Run with: node scripts/test-drive-detection.js
 */

const { execSync } = require('child_process');
const { existsSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

console.log('=== H Player Drive Detection Test ===\n');

// Test 1: WMIC command
console.log('1. Testing WMIC command...');
try {
  const output = execSync('wmic logicaldisk get caption,drivetype /format:csv', { encoding: 'utf8' });
  console.log('Raw WMIC output:');
  console.log(JSON.stringify(output));
  console.log('\nFormatted output:');
  console.log(output);
  
  const lines = output.split(/\r?\n/).filter(line => line.trim() && !line.toLowerCase().includes('caption'));
  console.log(`\nParsed ${lines.length} lines:`);
  lines.forEach((line, i) => {
    console.log(`  Line ${i}: "${line}"`);
    const parts = line.trim().split(',');
    console.log(`    Parts (${parts.length}):`, parts);
    if (parts.length >= 3) {
      console.log(`    Caption: "${parts[1].trim()}"`);
      console.log(`    DriveType: ${parts[2].trim()}`);
    }
  });
} catch (error) {
  console.error('WMIC command failed:', error.message);
}

// Test 2: Check specific drives
console.log('\n2. Testing specific drive paths...');
const testDrives = ['C:\\', 'D:\\', 'E:\\', 'Z:\\'];
testDrives.forEach(drivePath => {
  const exists = existsSync(drivePath);
  console.log(`  ${drivePath}: ${exists ? '✓ EXISTS' : '✗ DOES NOT EXIST'}`);
  
  if (exists) {
    try {
      const entries = readdirSync(drivePath);
      console.log(`    Found ${entries.length} entries at root`);
      // Show first 20 entries
      entries.slice(0, 20).forEach(entry => {
        const fullPath = join(drivePath, entry);
        try {
          const stats = statSync(fullPath);
          const type = stats.isDirectory() ? 'DIR ' : 'FILE';
          console.log(`      ${type}: ${entry}`);
        } catch (err) {
          console.log(`      ????: ${entry} (error reading stats)`);
        }
      });
      if (entries.length > 20) {
        console.log(`      ... and ${entries.length - 20} more`);
      }
    } catch (error) {
      console.log(`    Error reading directory: ${error.message}`);
    }
  }
});

// Test 3: Check folder name matching
console.log('\n3. Testing folder name matching...');
const FOLDER_NAMES = {
  MOVIES: ['movies', 'films'],
  TV_SHOWS: ['tv shows', 'tv', 'series', 'shows']
};

function isMoviesFolder(folderName) {
  const lowerName = folderName.toLowerCase();
  return FOLDER_NAMES.MOVIES.some(name => lowerName === name);
}

function isTVShowsFolder(folderName) {
  const lowerName = folderName.toLowerCase();
  return FOLDER_NAMES.TV_SHOWS.some(name => lowerName === name);
}

const testFolders = ['Movies', 'movies', 'MOVIES', 'Films', 'TV Shows', 'tv shows', 'TV', 'Series', 'Shows', 'Videos', 'Documents'];
testFolders.forEach(folder => {
  const isMovie = isMoviesFolder(folder);
  const isTV = isTVShowsFolder(folder);
  console.log(`  "${folder}":`);
  console.log(`    isMoviesFolder: ${isMovie}`);
  console.log(`    isTVShowsFolder: ${isTV}`);
});

// Test 4: Scan C: drive for Movies and TV Shows
console.log('\n4. Scanning C:\\ for Movies and TV Shows folders...');
if (existsSync('C:\\')) {
  try {
    const rootEntries = readdirSync('C:\\');
    console.log(`Found ${rootEntries.length} total entries at C:\\`);
    
    const directories = rootEntries.filter(entry => {
      try {
        const fullPath = join('C:\\', entry);
        return statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });
    
    console.log(`Found ${directories.length} directories at C:\\`);
    
    let foundMovies = false;
    let foundTVShows = false;
    
    directories.forEach(dir => {
      const isMovie = isMoviesFolder(dir);
      const isTV = isTVShowsFolder(dir);
      
      if (isMovie || isTV) {
        const type = isMovie ? 'MOVIES' : 'TV SHOWS';
        console.log(`  ✓ Found ${type} folder: "${dir}" at C:\\${dir}`);
        
        // List contents
        try {
          const contents = readdirSync(join('C:\\', dir));
          console.log(`    Contains ${contents.length} items:`);
          contents.slice(0, 10).forEach(item => {
            console.log(`      - ${item}`);
          });
          if (contents.length > 10) {
            console.log(`      ... and ${contents.length - 10} more`);
          }
        } catch (error) {
          console.log(`    Error reading contents: ${error.message}`);
        }
        
        if (isMovie) foundMovies = true;
        if (isTV) foundTVShows = true;
      }
    });
    
    console.log(`\nResults:`);
    console.log(`  Movies folder found: ${foundMovies ? '✓ YES' : '✗ NO'}`);
    console.log(`  TV Shows folder found: ${foundTVShows ? '✓ YES' : '✗ NO'}`);
    
  } catch (error) {
    console.error(`Error scanning C:\\: ${error.message}`);
  }
} else {
  console.log('C:\\ does not exist!');
}

console.log('\n=== Test Complete ===');
