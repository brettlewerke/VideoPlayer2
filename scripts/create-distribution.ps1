# H Player v3.0.0 Distribution Creator
# Creates compressed archives for distribution

param(
    [string]$Version = "3.0.0"
)

Write-Host "Creating H Player v$Version Distribution Packages..." -ForegroundColor Green

# Set paths
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ManualDir = Join-Path $ProjectRoot "dist-manual"
$OutputDir = Join-Path $ProjectRoot "distribution"

# Create output directory
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Create manual distribution ZIP
$ManualSource = Join-Path $ManualDir "H Player"
$ManualZip = Join-Path $OutputDir "H-Player-Manual-v$Version.zip"

if (Test-Path $ManualSource) {
    Write-Host "Creating manual distribution archive..." -ForegroundColor Cyan
    
    # Remove existing zip if it exists
    if (Test-Path $ManualZip) {
        Remove-Item $ManualZip -Force
    }
    
    # Create ZIP archive
    Compress-Archive -Path "$ManualSource\*" -DestinationPath $ManualZip -CompressionLevel Optimal
    
    $ZipSize = [math]::Round((Get-Item $ManualZip).Length / 1MB, 2)
    Write-Host "Manual distribution created: $ManualZip ($ZipSize MB)" -ForegroundColor Green
} else {
    Write-Host "Manual distribution source not found: $ManualSource" -ForegroundColor Red
    exit 1
}

# Create README for distribution
$ReadmeContent = @"
H Player v$Version - Distribution Package

What's Included

This package contains H Player, a local desktop video player for Movies and TV Shows.

Manual/Portable Version
- File: H-Player-Manual-v$Version.zip
- Size: $ZipSize MB
- Installation: Extract and run H Player.exe
- Features: Portable, no installation required, includes all dependencies

System Requirements

- OS: Windows 10/11 (64-bit)
- RAM: 4GB minimum, 8GB recommended
- Storage: 2GB free space
- Graphics: DirectX 11 compatible

Installation Instructions

Manual/Portable Installation
1. Extract H-Player-Manual-v$Version.zip to your desired location
2. Run H Player.exe to start the application
3. Optional: Use provided launcher scripts for convenience
   - Windows: Run-H-Player.bat or Run-H-Player.ps1
   - macOS: Run-H-Player.command
   - Linux: run-h-player.sh

Features

- Local video library with media management
- Automatic media detection from connected drives
- Modern Netflix-inspired interface
- Built-in Windows dependency repair system
- SQLite database for metadata caching
- Support for all major video formats via MPV/libVLC

Windows FFmpeg Dependencies

H Player includes an automatic repair system for Windows FFmpeg dependencies:
- Automatic detection of missing DLL files
- One-click repair with FFmpeg download
- Fallback to libVLC backend option
- Manual installation instructions

Troubleshooting

If you encounter issues:
1. Run as Administrator if needed
2. Use the built-in repair system (Settings -> Repair)
3. Check Windows Defender/antivirus exclusions
4. Verify all DLL files are present

License

MIT License - See LICENSE file for details

Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
H Player v$Version - Built with care
"@

$ReadmePath = Join-Path $OutputDir "README.txt"
$ReadmeContent | Out-File -FilePath $ReadmePath -Encoding UTF8

Write-Host "Distribution README created: $ReadmePath" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "Distribution packages created successfully!" -ForegroundColor Green
Write-Host "Location: $OutputDir" -ForegroundColor Cyan
Write-Host "Manual Package: H-Player-Manual-v$Version.zip ($ZipSize MB)" -ForegroundColor Cyan
Write-Host "Documentation: README.txt" -ForegroundColor Cyan

Write-Host ""
Write-Host "Ready for distribution!" -ForegroundColor Green