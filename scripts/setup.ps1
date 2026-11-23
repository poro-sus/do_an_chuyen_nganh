$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
function Run-Checked([scriptblock]$Action) {
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "Command failed with code $LASTEXITCODE" }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22+ from https://nodejs.org then run setup.bat again.' }
$toolsPath = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Path $toolsPath -Force | Out-Null
$phpExe = Join-Path $toolsPath 'php\php.exe'
if (-not (Test-Path -LiteralPath $phpExe)) {
    Write-Host 'Preparing portable PHP 8.4 without changing XAMPP...'
    $release = (Invoke-RestMethod 'https://windows.php.net/downloads/releases/releases.json').'8.4'.'nts-vs17-x64'.zip
    $archive = Join-Path $toolsPath 'php.zip'
    Invoke-WebRequest ('https://windows.php.net/downloads/releases/' + $release.path) -OutFile $archive -UseBasicParsing
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $release.sha256) { throw 'PHP archive checksum mismatch.' }
    Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $toolsPath 'php') -Force
    $ini = Get-Content -LiteralPath (Join-Path $toolsPath 'php\php.ini-development') -Raw
    $ini = $ini.Replace(';extension_dir = "ext"', 'extension_dir = "ext"')
    foreach ($extension in @('curl','fileinfo','gd','intl','mbstring','mysqli','openssl','pdo_mysql','pdo_sqlite','sqlite3','zip')) { $ini = $ini.Replace(';extension=' + $extension, 'extension=' + $extension) }
    $ini = $ini.Replace('upload_max_filesize = 2M', 'upload_max_filesize = 8M').Replace('post_max_size = 8M', 'post_max_size = 12M').Replace('memory_limit = 128M', 'memory_limit = 256M')
    [IO.File]::WriteAllText((Join-Path $toolsPath 'php\php.ini'), $ini)
}
Run-Checked { & $phpExe -v }
$composerFile = Join-Path $toolsPath 'composer.phar'
if (-not (Test-Path -LiteralPath $composerFile)) {
    $installer = Join-Path $toolsPath 'composer-setup.php'
    $signatureFile = Join-Path $toolsPath 'composer.sig'
    Invoke-WebRequest 'https://getcomposer.org/installer' -OutFile $installer -UseBasicParsing
    Invoke-WebRequest 'https://composer.github.io/installer.sig' -OutFile $signatureFile -UseBasicParsing
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA384).Hash.ToLower() -ne (Get-Content -LiteralPath $signatureFile -Raw).Trim()) { throw 'Composer installer checksum mismatch.' }
    Run-Checked { & $phpExe $installer ("--install-dir=" + $toolsPath) '--filename=composer.phar' }
}
Run-Checked { & $phpExe $composerFile install --working-dir=backend --no-interaction }
$envPath = Join-Path $projectRoot 'backend\.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath (Join-Path $projectRoot 'backend\.env.example') -Destination $envPath
    $securePassword = Read-Host 'Local MySQL password for the configured user' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try {
        $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        $envText = Get-Content -LiteralPath $envPath -Raw
        $passwordLine = 'DB_PASSWORD="' + $password.Replace('\','\\').Replace('"','\"') + '"'
        $envText = [regex]::Replace($envText,'(?m)^DB_PASSWORD=.*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $passwordLine })
        [IO.File]::WriteAllText($envPath,$envText)
    } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $password = $null }
}
Run-Checked { & $phpExe (Join-Path $PSScriptRoot 'database.php') }
Push-Location -LiteralPath (Join-Path $projectRoot 'backend')
try {
    $envText = Get-Content -LiteralPath '.env' -Raw
    if ($envText -notmatch '(?m)^APP_KEY=base64:') { Run-Checked { & $phpExe artisan key:generate --no-interaction } }
    Run-Checked { & $phpExe artisan migrate --force --no-interaction }
    Run-Checked { & $phpExe artisan db:seed --force --no-interaction }
    if (-not (Test-Path -LiteralPath 'public\storage')) { Run-Checked { & $phpExe artisan storage:link --no-interaction } }
} finally { Pop-Location }
Push-Location -LiteralPath (Join-Path $projectRoot 'frontend')
try { Run-Checked { npm.cmd ci }; Run-Checked { npm.cmd run build } } finally { Pop-Location }
Write-Host 'LIBRIVO is ready. Run start.bat and visit http://localhost:5173'
