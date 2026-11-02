$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
} else {
    $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $nodePath)) {
        throw 'Node.js 20以降をインストールしてから、再度実行してください。'
    }
}
Push-Location -LiteralPath $projectRoot
try {
    & $nodePath (Join-Path $projectRoot 'server.mjs')
} finally {
    Pop-Location
}
