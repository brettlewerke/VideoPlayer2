/**
 * Check the H Player database contents
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'h-player', 'database', 'videoplayer.db');

console.log('Database:', dbPath);
console.log('');

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Check movies
  const movieCount = db.prepare('SELECT COUNT(*) as count FROM movies').get();
  console.log(`Movies: ${movieCount.count}`);
  
  if (movieCount.count > 0) {
    const movies = db.prepare('SELECT id, title, year, videoFile FROM movies LIMIT 10').all();
    movies.forEach(m => {
      console.log(`  - ${m.title} (${m.year}) - ${m.videoFile}`);
    });
  }
  
  // Check shows
  const showCount = db.prepare('SELECT COUNT(*) as count FROM shows').get();
  console.log(`\nShows: ${showCount.count}`);
  
  if (showCount.count > 0) {
    const shows = db.prepare('SELECT id, title FROM shows LIMIT 10').all();
    shows.forEach(s => {
      console.log(`  - ${s.title}`);
    });
  }
  
  // Check drives
  console.log('\nDrives:');
  const drives = db.prepare('SELECT * FROM drives').all();
  drives.forEach(d => {
    console.log(`  - ${d.letter || d.mountPoint}: ${d.label} (connected: ${d.isConnected})`);
  });
  
  db.close();
} catch (error) {
  console.error('Error:', error.message);
}
