# Test Fixtures

This directory contains test media files for A/V/subtitle validation.

## Files

- `colorbars_10s.mp4` - 10-second H.264+AAC video with color bars pattern
- `sample_en.srt` - Simple 3-cue English subtitle file

## Regenerate Test Media

Run the following to generate test files using ffmpeg:

```bash
npm run dev:avassets
```

If ffmpeg is not available, prebuilt tiny samples are committed to the repository.
