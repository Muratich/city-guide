$ErrorActionPreference = 'Stop'

$pidFile = Join-Path $env:TEMP 'city-guide-minikube-forwards.json'
if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host 'No saved City Guide port-forward processes were found.'
    exit 0
}

$savedJson = Get-Content -LiteralPath $pidFile -Raw
if ([string]::IsNullOrWhiteSpace($savedJson)) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Host 'No saved City Guide port-forward processes were found.'
    exit 0
}

$savedProcesses = @(ConvertFrom-Json -InputObject $savedJson)
foreach ($saved in $savedProcesses) {
    $process = Get-Process -Id ([int]$saved.processId) -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        continue
    }

    $savedStart = [DateTime]::Parse($saved.startedUtc).ToUniversalTime()
    $actualStart = $process.StartTime.ToUniversalTime()
    if ($process.ProcessName -eq 'kubectl' -and [Math]::Abs(($actualStart - $savedStart).TotalSeconds) -lt 2) {
        Stop-Process -Id $process.Id
        Write-Host "Stopped $($saved.name) port-forward (PID $($process.Id))."
    }
}

Remove-Item -LiteralPath $pidFile -Force
