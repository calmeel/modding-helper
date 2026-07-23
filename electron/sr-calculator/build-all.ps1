param(
  [string]$WorktreeRoot = "C:\osu-tools\osu-wt",
  [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $projectDir "..\..")
$outputRoot = Join-Path $repoRoot "electron\resources\sr-calculator"
$projectPath = Join-Path $projectDir "ModdingHelper.SrCalculator.csproj"

$workers = @(
  @{ Name = "livePP2510"; Worktree = "osu_livePP2510"; Commit = "5af9bb784be1f058b22d83b0a93d484e588dc982"; Legacy = $false; OldCalculationApi = $false },
  @{ Name = "livePP2503"; Worktree = "osu_livePP2503"; Commit = "66b8b527e3e5b57a6529941f49a18ee8193c1a07"; Legacy = $false; OldCalculationApi = $false },
  @{ Name = "livePP2410"; Worktree = "osu_livePP2410"; Commit = "795477372f5185209ba53274047ba917269e135a"; Legacy = $false; OldCalculationApi = $false },
  @{ Name = "livePP2208"; Worktree = "osu_livePP2208"; Commit = "7655b9f4a4685f23dceb590324938225f126fcfe"; Legacy = $true; OldCalculationApi = $false },
  @{ Name = "livePP"; Worktree = "osu_livePP"; Commit = "65d693e8bd156063815e1cfc0c0cf0bc365aef3d"; Legacy = $true; OldCalculationApi = $true }
)

& (Join-Path $projectDir "build.ps1") -Runtime $Runtime
if ($LASTEXITCODE -ne 0) { throw "Current SR calculator publish failed." }

foreach ($worker in $workers) {
  $sourceRoot = Join-Path $WorktreeRoot $worker.Worktree
  if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Frozen ppy/osu worktree not found: $sourceRoot"
  }

  $actualCommit = (& git -c "safe.directory=$sourceRoot" -C $sourceRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $actualCommit -ne $worker.Commit) {
    throw "Unexpected $($worker.Worktree) commit. Expected $($worker.Commit), found $actualCommit."
  }

  $outputDir = Join-Path $outputRoot $worker.Name
  if (Test-Path -LiteralPath $outputDir) {
    Remove-Item -LiteralPath $outputDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $outputDir | Out-Null

  $publishProperties = @(
    "-p:PublishSingleFile=true",
    "-p:IncludeNativeLibrariesForSelfExtract=true",
    "-p:OsuSourceRoot=$sourceRoot",
    "-p:LegacyWorkingBeatmap=$($worker.Legacy.ToString().ToLowerInvariant())",
    "-p:OldCalculationApi=$($worker.OldCalculationApi.ToString().ToLowerInvariant())"
  )

  if ($worker.Legacy) {
    # Frozen historical dependencies remain unchanged; audit findings stay visible without failing the build.
    $publishProperties += "-p:WarningsNotAsErrors=NU1901%3BNU1902%3BNU1903%3BNU1904%3BIL3000"
  }

  Push-Location $projectDir
  try {
    dotnet publish $projectPath `
      --configuration Release `
      --runtime $Runtime `
      --self-contained true `
      --output $outputDir `
      @publishProperties
  } finally {
    Pop-Location
  }

  if ($LASTEXITCODE -ne 0) {
    throw "$($worker.Name) SR calculator publish failed."
  }

  Copy-Item -LiteralPath (Join-Path $sourceRoot "LICENCE") `
    -Destination (Join-Path $outputDir "LICENSE-ppy-osu.txt")
  Write-Host "$($worker.Name) SR calculator published to $outputDir"
}
