$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot '.runtime\processes.json'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No recorded project services.'; exit 0 }
function Stop-ProjectProcessTree([int]$ProcessId) {
    foreach ($child in @(Get-CimInstance Win32_Process -Filter ('ParentProcessId=' + $ProcessId) -ErrorAction SilentlyContinue)) {
        Stop-ProjectProcessTree -ProcessId $child.ProcessId
    }
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}
$records = ConvertFrom-Json -InputObject (Get-Content -LiteralPath $pidFile -Raw)
if ($records.PSObject.Properties.Name -contains 'value') { $records = $records.value }
foreach ($entry in $records) {
    $processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$entry.id) -ErrorAction SilentlyContinue
    if (-not $processInfo) { continue }
    $isProjectPhp = $processInfo.ExecutablePath -eq (Join-Path $projectRoot '.tools\php\php.exe')
    $isProjectNode = $processInfo.CommandLine -and $processInfo.CommandLine.Contains((Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'))
    if ($isProjectPhp -or $isProjectNode) {
        Stop-ProjectProcessTree -ProcessId $entry.id
    }
}
Remove-Item -LiteralPath $pidFile
Write-Host 'Recorded LIBRIVO services stopped.'
