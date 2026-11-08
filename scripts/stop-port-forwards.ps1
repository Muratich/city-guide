$ErrorActionPreference = 'Stop'

$pidFile = Join-Path $env:TEMP 'city-guide-minikube-forwards.json'

function Remove-SavedPidFile {
    try {
        [System.IO.File]::Delete($pidFile)
    }
    catch {
        Write-Warning "Could not remove the saved port-forward list '$pidFile': $($_.Exception.Message)"
    }
}

if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host 'No saved City Guide port-forward processes were found.'
    exit 0
}

$savedJson = Get-Content -LiteralPath $pidFile -Raw
if ([string]::IsNullOrWhiteSpace($savedJson)) {
    Remove-SavedPidFile
    Write-Host 'No saved City Guide port-forward processes were found.'
    exit 0
}

try {
    $savedProcesses = @(ConvertFrom-Json -InputObject $savedJson -ErrorAction Stop)
}
catch {
    Write-Warning "The saved port-forward list is not valid JSON; no processes were stopped. $($_.Exception.Message)"
    Remove-SavedPidFile
    exit 0
}

# Some Windows PowerShell versions return a root JSON array as one nested
# array. Flatten it and also handle a collapsed object whose fields are arrays.
$flatProcesses = New-Object 'System.Collections.Generic.List[object]'
$pending = New-Object 'System.Collections.Stack'
foreach ($entry in $savedProcesses) {
    $pending.Push($entry)
}
while ($pending.Count -gt 0) {
    $entry = $pending.Pop()
    if ($entry -is [array]) {
        foreach ($nestedEntry in $entry) {
            $pending.Push($nestedEntry)
        }
        continue
    }

    if ($null -ne $entry.name -and $entry.name -is [array]) {
        $names = @($entry.name)
        $processIds = @($entry.processId)
        $startedTimes = @($entry.startedUtc)
        if ($names.Count -eq $processIds.Count -and $names.Count -eq $startedTimes.Count) {
            for ($i = 0; $i -lt $names.Count; $i++) {
                $flatProcesses.Add([pscustomobject]@{
                    name = $names[$i]
                    processId = $processIds[$i]
                    startedUtc = $startedTimes[$i]
                })
            }
            continue
        }
    }

    $flatProcesses.Add($entry)
}

foreach ($saved in $flatProcesses) {
    # Only accept the scalar PID written by start-minikube.ps1. In particular,
    # never cast an array or arbitrary JSON value to a process ID.
    $rawProcessId = $saved.processId
    if ($null -eq $rawProcessId -or $rawProcessId -is [array] -or
        "$rawProcessId" -notmatch '^\d+$') {
        Write-Warning "Skipping malformed port-forward entry '$($saved.name)': processId must be a single integer."
        continue
    }

    $processId = 0
    if (-not [int]::TryParse([string]$rawProcessId, [ref]$processId)) {
        Write-Warning "Skipping malformed port-forward entry '$($saved.name)': processId is outside the valid range."
        continue
    }

    $savedStart = [DateTime]::MinValue
    if (-not [DateTime]::TryParse(
        [string]$saved.startedUtc,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::AssumeUniversal,
        [ref]$savedStart
    )) {
        Write-Warning "Skipping malformed port-forward entry '$($saved.name)': startedUtc is invalid."
        continue
    }

    # Verify both the executable and its command line before stopping it. This
    # prevents this cleanup script from stopping Minikube or unrelated kubectl.
    $processInfo = Get-CimInstance -ClassName Win32_Process `
        -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo -or $processInfo.Name -notmatch '^kubectl(\.exe)?$' -or
        $processInfo.CommandLine -notmatch '\bport-forward\b') {
        continue
    }

    try {
        $process = Get-Process -Id $processId -ErrorAction Stop
        $actualStart = $process.StartTime.ToUniversalTime()
        if ([Math]::Abs(($actualStart - $savedStart.ToUniversalTime()).TotalSeconds) -lt 2) {
            Stop-Process -Id $processId -ErrorAction Stop
            Write-Host "Stopped $($saved.name) port-forward (PID $processId)."
        }
    }
    catch {
        # The process may have exited between the CIM lookup and Stop-Process.
        Write-Verbose "Could not stop saved port-forward PID ${processId}: $($_.Exception.Message)"
    }
}

Remove-SavedPidFile
