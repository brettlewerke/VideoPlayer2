# Hoser Video Database Cleanup Script
# Removes .hoser-video folders from all drives
# This script can be run manually or is automatically called during uninstall

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hoser Video Database Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get all fixed drives (hard drives, not network or removable)
$drives = Get-PSDrive -PSProvider FileSystem | Where-Object { 
    $_.Root -match "^[A-Z]:\\" 
}

$foldersFound = 0
$foldersRemoved = 0
$errors = @()

Write-Host "Scanning all drives for .hoser-video folders..." -ForegroundColor Yellow
Write-Host ""

foreach ($drive in $drives) {
    $hoserPath = Join-Path $drive.Root ".hoser-video"
    
    if (Test-Path $hoserPath) {
        $foldersFound++
        Write-Host "  Found: $hoserPath" -ForegroundColor White
        
        try {
            # Get folder size before deletion
            $size = (Get-ChildItem $hoserPath -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            $sizeMB = [math]::Round($size / 1MB, 2)
            
            Write-Host "    Size: $sizeMB MB" -ForegroundColor Gray
            Write-Host "    Removing..." -ForegroundColor Yellow
            
            Remove-Item $hoserPath -Recurse -Force -ErrorAction Stop
            
            Write-Host "    [SUCCESS] Removed successfully" -ForegroundColor Green
            $foldersRemoved++
        }
        catch {
            $errorMsg = "Failed to remove $hoserPath : $($_.Exception.Message)"
            $errors += $errorMsg
            Write-Host "    [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
    }
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Folders found: $foldersFound" -ForegroundColor White
Write-Host "Folders removed: $foldersRemoved" -ForegroundColor Green

if ($errors.Count -gt 0) {
    Write-Host "Errors: $($errors.Count)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Red
    foreach ($err in $errors) {
        Write-Host "  - $err" -ForegroundColor Red
    }
}

if ($foldersFound -eq 0) {
    Write-Host ""
    Write-Host "No .hoser-video folders found on any drive." -ForegroundColor Green
}
elseif ($foldersRemoved -eq $foldersFound) {
    Write-Host ""
    Write-Host "All .hoser-video folders removed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cleanup complete." -ForegroundColor Cyan
