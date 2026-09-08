$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$fractalNode = Get-Command node -ErrorAction SilentlyContinue
if ($fractalNode) { $fractalRuntime = $fractalNode.Source } else { $fractalRuntime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $fractalRuntime)) { throw 'Install Node.js and pnpm, then run pnpm install and pnpm dev.' }
Write-Host 'Open http://127.0.0.1:3000 in your browser. Press Ctrl+C to stop.'
& $fractalRuntime node_modules/next/dist/bin/next dev --hostname 127.0.0.1
