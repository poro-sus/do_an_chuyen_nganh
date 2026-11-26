# Cài và chạy LIBRIVO trên một máy Windows mới, hoàn toàn tự động.
#
# Script tự lo: Git, Node.js, PHP 8.4 (bản portable, không đụng PHP có sẵn), Composer,
# tải code từ GitHub, tạo backend\.env, cài thư viện, tạo CSDL, rồi chạy backend + frontend.
#
# Cách chạy: bấm đúp file setup-local.bat (hoặc chạy lệnh dưới trong PowerShell)
#   powershell -NoProfile -ExecutionPolicy Bypass -File setup-local.ps1
#
# Tham số (không bắt buộc):
#   -Mode sqlite   CSDL riêng trên máy (file SQLite + dữ liệu mẫu). An toàn, khuyến nghị.
#   -Mode render   Nối vào Postgres của Render (dữ liệu thật của site đã deploy).
#   -Dir <thư mục> Nơi cài đặt. Mặc định: %USERPROFILE%\librivo
#   -NoStart       Cài xong thì thôi, không mở backend/frontend.

param(
    [ValidateSet('', 'sqlite', 'render')][string]$Mode = '',
    [string]$Dir = (Join-Path $env:USERPROFILE 'librivo'),
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest nhanh hơn nhiều khi tắt thanh tiến trình
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoUrl   = 'https://github.com/poro-sus/do_an_chuyen_nganh.git'
$RenderHost = ''   # chế độ render: nhập host của External Database URL khi script hỏi

function Write-Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Test-Cmd($name)   { [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machine;$user"
}
function Install-WithWinget($id) {
    if (-not (Test-Cmd 'winget')) {
        throw "Máy chưa có winget nên không tự cài $id được. Hãy cập nhật 'App Installer' trong Microsoft Store, hoặc tự cài $id rồi chạy lại script."
    }
    winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements
    Update-SessionPath
}
function Assert-LastExit($what) {
    if ($LASTEXITCODE -ne 0) { throw "$what thất bại (mã lỗi $LASTEXITCODE). Xem thông báo ngay phía trên." }
}

New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$tools = Join-Path $Dir '.tools'
New-Item -ItemType Directory -Force -Path $tools | Out-Null

# ---------- Chọn CSDL ----------
if (-not $Mode) {
    Write-Host ''
    Write-Host 'Chọn CSDL cho bản chạy trên máy này:'
    Write-Host '  1) SQLite riêng trên máy, có dữ liệu mẫu (an toàn, khuyến nghị)'
    Write-Host '  2) Nối vào Postgres của Render (dữ liệu THẬT của site đã deploy)'
    $choice = Read-Host 'Nhập 1 hoặc 2 [1]'
    $Mode = if ($choice -eq '2') { 'render' } else { 'sqlite' }
}

$renderPassword = ''
if ($Mode -eq 'render') {
    $h = Read-Host 'Host của External Database URL (dạng dpg-xxxx-a.oregon-postgres.render.com)'
    if ($h) { $RenderHost = $h.Trim() }
    if (-not $RenderHost) { throw 'Chưa nhập host DB.' }
    $sec = Read-Host 'Mật khẩu DB (copy từ Render, nhập sẽ không hiện)' -AsSecureString
    $renderPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
    if (-not $renderPassword) { throw 'Chưa nhập mật khẩu DB.' }
}

# ---------- 1. Git ----------
Write-Step 'Kiểm tra Git'
if (-not (Test-Cmd 'git')) {
    Install-WithWinget 'Git.Git'
    if (-not (Test-Cmd 'git')) { $env:Path += ';C:\Program Files\Git\cmd' }
}
if (-not (Test-Cmd 'git')) { throw 'Không tìm thấy git sau khi cài. Mở lại PowerShell rồi chạy lại script.' }
git --version

# ---------- 2. Node.js (cần >= 22) ----------
Write-Step 'Kiểm tra Node.js'
$nodeMajor = 0
if (Test-Cmd 'node') { $nodeMajor = [int](((node -v) -replace '^v', '').Split('.')[0]) }
if ($nodeMajor -lt 22) {
    Install-WithWinget 'OpenJS.NodeJS.LTS'
    if (-not (Test-Cmd 'node')) { $env:Path += ';C:\Program Files\nodejs' }
    if (Test-Cmd 'node') { $nodeMajor = [int](((node -v) -replace '^v', '').Split('.')[0]) }
}
if ($nodeMajor -lt 22) { throw 'Cần Node.js 22 trở lên. Tải ở https://nodejs.org rồi chạy lại script.' }
Write-Host "Node $(node -v)"

# ---------- 3. PHP 8.4 portable ----------
Write-Step 'Chuẩn bị PHP 8.4 (portable)'
$phpDir = Join-Path $tools 'php'
$php = Join-Path $phpDir 'php.exe'
if (-not (Test-Path $php)) {
    # PHP bản vs17 cần Visual C++ Runtime. Đã có sẵn thì winget tự bỏ qua.
    if (Test-Cmd 'winget') {
        winget install --id 'Microsoft.VCRedist.2015+.x64' -e --silent --accept-package-agreements --accept-source-agreements
    }
    $rel = Invoke-RestMethod 'https://windows.php.net/downloads/releases/releases.json'
    $entry = $rel.'8.4'.'nts-vs17-x64'.zip
    if (-not $entry) { throw 'Không tìm thấy bản PHP 8.4 trên windows.php.net.' }
    $zip = Join-Path $tools $entry.path
    Write-Host "Tải $($entry.path) ($($entry.size))..."
    Invoke-WebRequest ('https://windows.php.net/downloads/releases/' + $entry.path) -OutFile $zip -UseBasicParsing
    $hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($hash -ne $entry.sha256) { throw 'File PHP tải về bị sai mã SHA256, không dùng.' }
    Expand-Archive -Path $zip -DestinationPath $phpDir -Force
    Remove-Item $zip
}
$ini = Join-Path $phpDir 'php.ini'
if (-not (Test-Path $ini)) {
    $cacert = Join-Path $phpDir 'cacert.pem'
    Invoke-WebRequest 'https://curl.se/ca/cacert.pem' -OutFile $cacert -UseBasicParsing
    $c = Get-Content (Join-Path $phpDir 'php.ini-development') -Raw
    $c = $c -replace '(?m)^;\s*extension_dir = "ext"', 'extension_dir = "ext"'
    foreach ($e in 'curl', 'fileinfo', 'gd', 'intl', 'mbstring', 'openssl', 'pdo_pgsql', 'pdo_sqlite', 'pgsql', 'sqlite3', 'zip') {
        $c = $c -replace "(?m)^;\s*extension=$e\s*$", "extension=$e"
    }
    $c = $c -replace '(?m)^;\s*curl\.cainfo\s*=.*$', "curl.cainfo=`"$cacert`""
    $c = $c -replace '(?m)^;\s*openssl\.cafile\s*=.*$', "openssl.cafile=`"$cacert`""
    Set-Content -Path $ini -Value $c -Encoding ASCII
}
$modules = (& $php -m) -join ' '
foreach ($need in 'pdo_pgsql', 'pdo_sqlite', 'mbstring', 'intl', 'gd', 'zip', 'fileinfo', 'openssl', 'curl') {
    if ($modules -notmatch "(?m)\b$need\b") { throw "PHP thiếu extension $need (kiểm tra $ini)." }
}
Write-Host (& $php -v)[0]

# ---------- 4. Composer ----------
Write-Step 'Chuẩn bị Composer'
$composer = Join-Path $tools 'composer.phar'
if (-not (Test-Path $composer)) {
    Invoke-WebRequest 'https://getcomposer.org/download/latest-stable/composer.phar' -OutFile $composer -UseBasicParsing
}
$env:COMPOSER_ALLOW_SUPERUSER = '1'

# ---------- 5. Tải code ----------
Write-Step 'Tải code từ GitHub'
$app = Join-Path $Dir 'app'
if (Test-Path (Join-Path $app '.git')) {
    git -C $app pull --ff-only
    Assert-LastExit 'git pull'
} else {
    git clone $RepoUrl $app
    Assert-LastExit 'git clone'
}
$be = Join-Path $app 'backend'
$fe = Join-Path $app 'frontend'

# ---------- 6. Backend ----------
Write-Step 'Cài thư viện backend (composer install)'
Push-Location $be
& $php $composer install --no-interaction --no-progress --prefer-dist
Assert-LastExit 'composer install'

Write-Step "Tạo backend\.env (chế độ $Mode)"
$envFile = Join-Path $be '.env'
if (Test-Path $envFile) {
    Copy-Item $envFile ($envFile + '.bak-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
}
$common = @(
    'APP_NAME=LIBRIVO',
    'APP_ENV=local',
    'APP_DEBUG=true',
    'APP_KEY=',
    'APP_URL=http://localhost:8000',
    'FRONTEND_URL=http://localhost:5173',
    'SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost',
    'SESSION_DRIVER=database',
    'CACHE_STORE=database',
    'QUEUE_CONNECTION=database',
    'MAIL_MAILER=log'
)
if ($Mode -eq 'sqlite') {
    $dbFile = Join-Path $be 'database\database.sqlite'
    if (-not (Test-Path $dbFile)) { New-Item -ItemType File -Force -Path $dbFile | Out-Null }
    $dbLines = @('DB_CONNECTION=sqlite', "DB_DATABASE='$dbFile'")
} else {
    $dbLines = @(
        'DB_CONNECTION=pgsql',
        "DB_HOST=$RenderHost",
        'DB_PORT=5432',
        'DB_DATABASE=librivo',
        'DB_USERNAME=librivo',
        "DB_PASSWORD='$renderPassword'",
        'DB_SSLMODE=require'
    )
}
Set-Content -Path $envFile -Value ($common + $dbLines) -Encoding ASCII

& $php artisan key:generate --force
Assert-LastExit 'artisan key:generate'
& $php artisan config:clear
try { & $php artisan storage:link --force } catch { Write-Host 'Bỏ qua storage:link (Windows cần quyền tạo symlink).' }

if ($Mode -eq 'sqlite') {
    Write-Step 'Tạo bảng và nạp dữ liệu mẫu'
    & $php artisan migrate --seed --force
    Assert-LastExit 'artisan migrate --seed'
} else {
    Write-Step 'Kiểm tra kết nối tới Postgres của Render (chỉ đọc, không ghi gì)'
    & $php artisan migrate:status
    if ($LASTEXITCODE -ne 0) {
        throw 'Không nối được DB Render. Kiểm tra host, mật khẩu, và mạng có chặn cổng 5432 không (thử hotspot điện thoại).'
    }
}
Pop-Location

# ---------- 7. Frontend ----------
Write-Step 'Cài thư viện frontend (npm install)'
Push-Location $fe
npm install --no-audit --no-fund
Assert-LastExit 'npm install'
Pop-Location

# ---------- 8. Tạo file chạy lại ----------
$startBat = Join-Path $Dir 'start.bat'
$batLines = @(
    '@echo off',
    "start ""LIBRIVO backend"" /D ""$be"" cmd /k """"$php"" artisan serve""",
    "start ""LIBRIVO frontend"" /D ""$fe"" cmd /k npm run dev",
    'timeout /t 8 >nul',
    'start http://localhost:5173'
)
Set-Content -Path $startBat -Value $batLines -Encoding ASCII

Write-Host ''
Write-Host 'XONG. Cài đặt hoàn tất.' -ForegroundColor Green
Write-Host "  Lần sau chỉ cần bấm đúp: $startBat"
Write-Host '  Web: http://localhost:5173   |   API: http://localhost:8000'
if ($Mode -eq 'sqlite') {
    Write-Host '  Tài khoản demo (xem README của repo): admin@librivo.local'
} else {
    Write-Host '  CẢNH BÁO: đang dùng DB thật của Render. Đừng chạy migrate:fresh hay db:seed.' -ForegroundColor Yellow
}

if (-not $NoStart) {
    Write-Step 'Mở backend và frontend'
    & $startBat
}
