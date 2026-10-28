param([string]$RuntimePath = (Join-Path $PSScriptRoot '..\.sites-runtime\erpnext'))
$ErrorActionPreference='Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is required. Install Docker Desktop, start its Linux engine, then run this script again.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
docker compose version
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }
$runtimeRoot=[IO.Path]::GetFullPath($RuntimePath)
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$repoPath=Join-Path $runtimeRoot 'frappe_docker'
$pinnedCommit='2c2980af1d3dcd2962a3f562184db652f63643bb'
if (-not (Test-Path -LiteralPath $repoPath)) { git clone --no-checkout https://github.com/frappe/frappe_docker.git $repoPath; if ($LASTEXITCODE -ne 0) { throw 'Unable to clone the official Frappe Docker repository.' } }
git -C $repoPath fetch --depth 1 origin $pinnedCommit
if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch the pinned setup.' }
git -C $repoPath checkout --detach $pinnedCommit
if ($LASTEXITCODE -ne 0) { throw 'Unable to select the pinned setup. Check for local changes.' }
# The official pwd.yml is a disposable evaluation stack, not a production deployment.
$composeText=[IO.File]::ReadAllText((Join-Path $repoPath 'pwd.yml')).Replace('"8080:8080"','"127.0.0.1:8080:8080"')
if (-not $composeText.Contains('127.0.0.1:8080:8080')) { throw 'Unable to verify a loopback-only port binding.' }
$composePath=Join-Path $runtimeRoot 'compose.local.yaml'
[IO.File]::WriteAllText($composePath,$composeText)
docker compose --project-name astroworld-erpnext --file $composePath up -d
if ($LASTEXITCODE -ne 0) { throw 'ERPNext containers did not start. Inspect Docker before retrying.' }
Write-Host 'ERPNext evaluation stack started. Wait for site creation, then open http://127.0.0.1:8080.'
Write-Host 'Official evaluation login: Administrator / admin. This is separate from the storefront admin login.'
Write-Host 'This loopback-only evaluation instance is not reachable from the hosted store. Use a proper HTTPS ERPNext host for that connection.'
