# export_db_wiki.ps1  (PowerShell 5.1)
# Pulls Markdown for each object from tenant_1001.fn_schema_wiki_md(<schema>), one file per query.

$ErrorActionPreference = 'Stop'

# ----- Config from env (set in .bat) -----
if (-not $env:PGHOST)     { $env:PGHOST     = "127.0.0.1" }
if (-not $env:PGPORT)     { $env:PGPORT     = "5432" }
if (-not $env:PGUSER)     { $env:PGUSER     = "postgres" }
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = "postgres" }
if (-not $env:PGDATABASE) { $env:PGDATABASE = "postgres" }
if (-not $env:SCHEMA)     { $env:SCHEMA     = "tenant_1001" }
if (-not $env:OUTDIR)     { $env:OUTDIR     = "docs\db\tenant_1001" }

$schema = $env:SCHEMA
$outDir = $env:OUTDIR

# ----- Resolve psql.exe -----
$psql = $null
if ($env:PSQL_BIN -and (Test-Path $env:PSQL_BIN)) {
  $psql = $env:PSQL_BIN
} elseif (Test-Path (Join-Path $PSScriptRoot 'psql.exe')) {
  $psql = (Join-Path $PSScriptRoot 'psql.exe')
} else {
  $gc = Get-Command psql -ErrorAction SilentlyContinue
  if ($gc) { $psql = $gc.Source }
}
if (-not $psql) { throw "psql not found. Set PSQL_BIN to full path of psql.exe." }
& "$psql" --version | Out-Null

# ----- Ensure output dir -----
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# ----- 1) Get list of file names -----
$listSql    = "SELECT file_name FROM $schema.fn_schema_wiki_md('$schema') ORDER BY file_name;"
$fileListRaw = & "$psql" -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -At -c $listSql
if ($LASTEXITCODE -ne 0) { throw 'psql failed to list files' }
$fileNames = $fileListRaw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

# ----- 2) Write each file (base64) -----
$wrote = 0
foreach ($fn in $fileNames) {
  $safe = $fn.Replace("'", "''")
  $q = "SELECT encode(convert_to(md,'UTF8'),'base64') FROM $schema.fn_schema_wiki_md('$schema') WHERE file_name = '$safe' LIMIT 1;"
  $b64 = & "$psql" -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -At -c $q
  if ($LASTEXITCODE -ne 0) { Write-Warning ("skip {0} (query error)" -f $fn); continue }

  $b64 = ($b64 -join '') -replace '\s',''   # strip whitespace/newlines from psql
  if ([string]::IsNullOrWhiteSpace($b64)) { Write-Warning ("empty content for {0}" -f $fn); continue }

  try   { $bytes = [Convert]::FromBase64String($b64) }
  catch { Write-Warning ("bad base64 for {0}" -f $fn); continue }

  $path = Join-Path $outDir $fn
  New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
  [IO.File]::WriteAllBytes($path, $bytes)
  $wrote++
}

# ----- 3) Write index -----
$idx = Join-Path $outDir "INDEX.md"
$ts  = Get-Date -Format "yyyy-MM-dd HH:mm"
$indexLines = @("# $schema - DB Wiki", "", "_Generated: $ts_", "", "## Objects")
$indexLines += ($fileNames | ForEach-Object { "- [$($_)]($($_))" })
[IO.File]::WriteAllText($idx, ($indexLines -join "`n"), [Text.Encoding]::UTF8)

Write-Host ("Wrote {0} files to {1}" -f $wrote, $outDir)
exit 0
