const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Get the input file from command line arguments
const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: node convert-mkv-to-mp4.js <input.mkv>');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

// Generate output filename
const parsedPath = path.parse(inputFile);
const outputFile = path.join(parsedPath.dir, `${parsedPath.name}.mp4`);
const srtFile = path.join(parsedPath.dir, `${parsedPath.name}.srt`);

console.log(`Converting: ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log(`Subtitle: ${srtFile}`);

// Path to ffmpeg
const vendorDir = path.join(__dirname, '..', 'vendor', 'ffmpeg-standalone');
const ffmpegPath = path.join(vendorDir, 'ffmpeg.exe');

// Download ffmpeg if not present
async function ensureFfmpeg() {
  if (fs.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }

  console.log('\nFFmpeg not found. Downloading standalone ffmpeg...');
  
  if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
  }

  // Using ffmpeg-static package which provides standalone ffmpeg binary
  const ffmpegStatic = require('ffmpeg-static');
  
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    console.log(`Using ffmpeg from ffmpeg-static package: ${ffmpegStatic}`);
    return ffmpegStatic;
  }

  throw new Error('Could not find or download ffmpeg. Please install ffmpeg-static: npm install ffmpeg-static');
}

// Main conversion function
async function convert() {
  try {
    const ffmpeg = await ensureFfmpeg();

    // First, extract subtitles to external SRT file
    console.log('\nExtracting subtitles to external SRT file...');
    const srtArgs = [
      '-i', inputFile,
      '-map', '0:s:0',  // Extract first subtitle stream
      '-c:s', 'srt',
      '-y',
      srtFile
    ];

    await new Promise((resolve, reject) => {
      const srtProcess = execFile(ffmpeg, srtArgs, (error, stdout, stderr) => {
        if (error) {
          console.warn(`Warning: Could not extract subtitles: ${error.message}`);
          console.warn('Continuing with video conversion...\n');
          resolve(); // Continue even if subtitle extraction fails
        } else {
          console.log(`✓ Subtitles extracted to: ${srtFile}\n`);
          resolve();
        }
      });

      srtProcess.stderr.on('data', (data) => {
        // Suppress verbose ffmpeg output for subtitle extraction
      });
    });

    // FFmpeg conversion command for MP4
    // Map all streams and include subtitles in multiple ways for compatibility
    const args = [
      '-i', inputFile,
      '-map', '0:v',       // Map all video streams
      '-map', '0:a',       // Map all audio streams
      '-map', '0:s?',      // Map all subtitle streams (if any)
      '-c:v', 'copy',      // Copy video stream without re-encoding
      '-c:a', 'copy',      // Copy audio stream without re-encoding
      '-c:s', 'mov_text',  // Convert subtitles to mov_text format (MP4 compatible)
      '-metadata:s:s:0', 'language=eng',  // Set subtitle language metadata
      '-y',                // Overwrite output file if it exists
      outputFile
    ];

    console.log('\nStarting conversion...');
    console.log(`Command: ${ffmpeg} ${args.join(' ')}\n`);

    const ffmpegProcess = execFile(ffmpeg, args, (error, stdout, stderr) => {
      if (error) {
        console.error(`\nError during conversion: ${error.message}`);
        console.error(stderr);
        process.exit(1);
      }
      
      console.log('\n✓ Conversion completed successfully!');
      console.log(`Output file: ${outputFile}`);
      if (fs.existsSync(srtFile)) {
        console.log(`Subtitle file: ${srtFile}`);
        console.log('\n📝 To use subtitles in Windows Media Player:');
        console.log('   1. Make sure the .srt file is in the same folder as the .mp4');
        console.log('   2. Ensure both files have the EXACT same name');
        console.log('   3. Right-click the video → Lyrics, captions, and subtitles → On if available');
        console.log('\n   Or use VLC Media Player which has better subtitle support!');
      }
      
      // Show file sizes
      const inputSize = fs.statSync(inputFile).size;
      const outputSize = fs.statSync(outputFile).size;
      console.log(`\nInput size: ${(inputSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Output size: ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    });

    // Show FFmpeg progress output
    ffmpegProcess.stderr.on('data', (data) => {
      process.stdout.write(data.toString());
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the conversion
convert();
