$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$phpExe = Join-Path $projectRoot '.tools\php\php.exe'
$nodeExe = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $phpExe)) { throw 'Run setup.bat first to prepare PHP.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'backend\vendor\autoload.php'))) { throw 'Run setup.bat first.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'))) { throw 'Run setup.bat first.' }
$runtime = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$ownedProcesses = @()
function Test-ProjectPort([int]$Port) {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) { return $false }
    foreach ($listener in $listeners) {
        $info = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener.OwningProcess)
        $isApi = $Port -eq 8000 -and $info.ExecutablePath -eq $phpExe
        $isFrontend = $Port -eq 5173 -and $info.CommandLine -and $info.CommandLine.Contains((Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'))
        if (-not ($isApi -or $isFrontend)) { throw "Port $Port is used by another application. Stop it or change LIBRIVO configuration first." }
    }
    return $true
}
$pidFile = Join-Path $runtime 'processes.json'
if (Test-Path -LiteralPath $pidFile) {
    $loaded = ConvertFrom-Json -InputObject (Get-Content -LiteralPath $pidFile -Raw)
    if ($loaded.PSObject.Properties.Name -contains 'value') { $loaded = $loaded.value }
    foreach ($entry in $loaded) { if ($entry.id) { $ownedProcesses += $entry } }
}
if (-not (Test-ProjectPort 8000)) {
    $p = Start-Process -FilePath $phpExe -ArgumentList @('artisan','serve','--host=localhost','--port=8000','--no-reload') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'backend.log') -RedirectStandardError (Join-Path $runtime 'backend-error.log') -PassThru
    $ownedProcesses += @{ id=$p.Id; kind='api' }
}
if (-not (Test-ProjectPort 5173)) {
    $viteFile = Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'
    $p = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $viteFile + '"'),'--host','localhost','--port','5173','--strictPort') -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'frontend.log') -RedirectStandardError (Join-Path $runtime 'frontend-error.log') -PassThru
    $ownedProcesses += @{ id=$p.Id; kind='frontend' }
}
$hasScheduler = @($ownedProcesses | Where-Object { $_.kind -eq 'scheduler' -and (Get-Process -Id $_.id -ErrorAction SilentlyContinue) }).Count -gt 0
if (-not $hasScheduler) {
    $p = Start-Process -FilePath $phpExe -ArgumentList @('artisan','schedule:work','--no-interaction') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'scheduler.log') -RedirectStandardError (Join-Path $runtime 'scheduler-error.log') -PassThru
    $ownedProcesses += @{ id=$p.Id; kind='scheduler' }
}
ConvertTo-Json -InputObject $ownedProcesses -Depth 3 | Set-Content -LiteralPath $pidFile -Encoding UTF8
foreach ($url in @('http://localhost:8000/up', 'http://localhost:5173')) {
    $deadline = (Get-Date).AddSeconds(15)
    $ready = $false
    do {
        try { $ready = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $ready = $false }
        if (-not $ready) { Start-Sleep -Milliseconds 250 }
    } while (-not $ready -and (Get-Date) -lt $deadline)
    if (-not $ready) { throw "Service did not become ready at $url. Check .runtime logs." }
}
Write-Host 'LIBRIVO: http://localhost:5173'
Write-Host 'API:     http://localhost:8000'
Write-Host 'Scheduler runs in the background. Use stop.bat to stop project services.'
