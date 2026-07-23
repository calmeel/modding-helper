param(
  [string]$OsuSourceRoot = "C:\osu-tools\osu-wt\osu_lazer2607",
  [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"

$expectedCommit = "e643ee36788f31ac2c2d07a3e19cd6fb563f2258"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $projectDir "..\..")
$outputDir = Join-Path $repoRoot "electron\resources\sr-calculator"
$projectPath = Join-Path $projectDir "ModdingHelper.SrCalculator.csproj"

if (-not (Test-Path -LiteralPath $OsuSourceRoot -PathType Container)) {
  throw "Frozen ppy/osu worktree not found: $OsuSourceRoot"
}

$actualCommit = (& git -c "safe.directory=$OsuSourceRoot" -C $OsuSourceRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $expectedCommit) {
  throw "Unexpected ppy/osu commit. Expected $expectedCommit, found $actualCommit."
}

if (-not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
} else {
  Get-ChildItem -LiteralPath $outputDir -File |
    Remove-Item -Force
}

Push-Location $projectDir
try {
  dotnet publish $projectPath `
    --configuration Release `
    --runtime $Runtime `
    --self-contained true `
    --output $outputDir `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:OsuSourceRoot=$OsuSourceRoot
} finally {
  Pop-Location
}

if ($LASTEXITCODE -ne 0) {
  throw "SR calculator publish failed."
}

Copy-Item -LiteralPath (Join-Path $OsuSourceRoot "LICENCE") `
  -Destination (Join-Path $outputDir "LICENSE-ppy-osu.txt")
Write-Host "SR calculator published to $outputDir"
