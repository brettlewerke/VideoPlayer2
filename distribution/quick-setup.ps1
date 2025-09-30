# H Player v3.0.0 - Quick Download and Run Script
# This script helps users download and execute H Player

param(
    [string]$DownloadPath = "$env:USERPROFILE\Downloads\H-Player",
    [switch]$Extract,
    [switch]$Run
)

Write-Host "H Player v3.0.0 - Quick Setup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if ZIP file exists
$ZipFile = "H-Player-Manual-v3.0.0.zip"
$ZipPath = Join-Path $DownloadPath $ZipFile
$ExtractPath = Join-Path $DownloadPath "H Player"

if (!(Test-Path $DownloadPath)) {
    Write-Host "Creating download directory: $DownloadPath" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $DownloadPath -Force | Out-Null
}

# If ZIP exists, offer to extract
if (Test-Path $ZipPath) {
    Write-Host "Found H Player package: $ZipPath" -ForegroundColor Green
    
    if ($Extract -or $Run) {
        if (Test-Path $ExtractPath) {
            Write-Host "Removing existing extraction..." -ForegroundColor Yellow
            Remove-Item $ExtractPath -Recurse -Force
        }
        
        Write-Host "Extracting H Player..." -ForegroundColor Cyan
        Expand-Archive -Path $ZipPath -DestinationPath $DownloadPath -Force
        Write-Host "Extraction complete!" -ForegroundColor Green
    }
    
    if ($Run) {
        $ExePath = Join-Path $ExtractPath "H Player.exe"
        if (Test-Path $ExePath) {
            Write-Host "Starting H Player..." -ForegroundColor Green
            Start-Process -FilePath $ExePath
        } else {
            Write-Host "H Player.exe not found. Please check extraction." -ForegroundColor Red
        }
    }
} else {
    Write-Host "H Player package not found at: $ZipPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Cyan
    Write-Host "1. Download H-Player-Manual-v3.0.0.zip to: $DownloadPath" -ForegroundColor White
    Write-Host "2. Run this script again with -Extract to extract the files" -ForegroundColor White
    Write-Host "3. Or use -Run to extract and start H Player automatically" -ForegroundColor White
    Write-Host ""
    Write-Host "Example usage:" -ForegroundColor Green
    Write-Host "  .\quick-setup.ps1 -Extract        # Extract only" -ForegroundColor Gray
    Write-Host "  .\quick-setup.ps1 -Run           # Extract and run" -ForegroundColor Gray
    Write-Host "  .\quick-setup.ps1 -DownloadPath 'C:\Apps' -Run  # Custom location" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Manual Steps:" -ForegroundColor Cyan
Write-Host "1. Extract H-Player-Manual-v3.0.0.zip" -ForegroundColor White
Write-Host "2. Run 'H Player.exe' from extracted folder" -ForegroundColor White
Write-Host "3. Use built-in repair system if needed (Settings -> Repair)" -ForegroundColor White