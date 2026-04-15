param(
  [string]$BuildExePath = "src-tauri\target\release\checktask_explorer.exe",
  [string]$InstalledExePath = "$env:LOCALAPPDATA\Checktask Explorer\checktask_explorer.exe",
  [string]$ReportPath = "src-tauri\target\release\update-report.txt"
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path ".").Path
$buildExe = Join-Path $projectRoot $BuildExePath
$installedExe = $InstalledExePath
$reportFile = Join-Path $projectRoot $ReportPath

if (-not (Test-Path $buildExe)) {
  throw "Build exe not found at: $buildExe. Run npm run desktop:build first."
}

Get-Process -Name "checktask_explorer" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

$installedDir = Split-Path $installedExe -Parent
if (-not (Test-Path $installedDir)) {
  New-Item -ItemType Directory -Path $installedDir -Force | Out-Null
}

Copy-Item -LiteralPath $buildExe -Destination $installedExe -Force

$buildHash = (Get-FileHash $buildExe -Algorithm SHA256).Hash
$installedHash = (Get-FileHash $installedExe -Algorithm SHA256).Hash

$status = if ($buildHash -eq $installedHash) { "OK" } else { "MISMATCH" }
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$reportLines = @(
  "timestamp=$timestamp"
  "status=$status"
  "buildExe=$buildExe"
  "installedExe=$installedExe"
  "buildHash=$buildHash"
  "installedHash=$installedHash"
  ""
)

$reportDir = Split-Path $reportFile -Parent
if (-not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$reportLines | Out-File -FilePath $reportFile -Encoding utf8 -Append

Write-Output "status=$status"
Write-Output "buildHash=$buildHash"
Write-Output "installedHash=$installedHash"
Write-Output "report=$reportFile"

if ($status -ne "OK") {
  throw "Installed executable hash does not match build executable hash."
}

Start-Process -FilePath $installedExe
