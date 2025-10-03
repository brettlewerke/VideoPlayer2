/**
 * Check video file codecs using Electron's MediaSource API
 */

const { exec } = require('child_process');
const path = require('path');

const videoPath = 'D:\\Movies\\TheNakedGun (2025)\\TheNakedGun (2025).mkv';

console.log('Checking codec support in Chromium...\n');

// Check what Chromium/Electron supports
const codecs = [
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',  // H.264 + AAC
  'video/mp4; codecs="avc1.42E01E, ac-3"',       // H.264 + AC3
  'video/mp4; codecs="avc1.42E01E, ec-3"',       // H.264 + E-AC3
  'video/webm; codecs="vp8, vorbis"',            // VP8 + Vorbis
  'audio/mp4; codecs="mp4a.40.2"',               // AAC audio
  'audio/mp4; codecs="ac-3"',                    // AC3 audio
  'audio/mp4; codecs="ec-3"',                    // E-AC3 audio
];

console.log('MediaSource.isTypeSupported() results:\n');
codecs.forEach(codec => {
  // This would need to run in renderer process
  console.log(`${codec}`);
  console.log(`  Would need to check in browser context`);
});

console.log('\n⚠️  Important Notes:');
console.log('1. Even with full FFmpeg, Chromium may not support AC3/DTS audio');
console.log('2. This is a Chromium limitation, not an FFmpeg limitation');
console.log('3. AC3 audio works in: VLC, MPV, MPC-HC, but NOT in Chrome/Electron');
console.log('4. Solution: Either convert audio to AAC, or use external player');

console.log('\n💡 To check what codec The Naked Gun uses:');
console.log('   Install MediaInfo: https://mediaarea.net/en/MediaInfo');
console.log('   Or use VLC: Tools > Codec Information');
