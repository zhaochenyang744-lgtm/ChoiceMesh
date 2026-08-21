$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodeDir = Join-Path $runtimeRoot 'node\bin'
$env:Path = "$nodeDir;$env:Path"
& (Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd') start
