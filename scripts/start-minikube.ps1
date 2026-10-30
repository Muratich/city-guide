$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$stopForwardScript = Join-Path $PSScriptRoot 'stop-port-forwards.ps1'
if (Test-Path -LiteralPath $stopForwardScript) {
    & $stopForwardScript
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

function Test-LocalPortAvailable {
    param([Parameter(Mandatory = $true)][int]$Port)

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        $listener.Stop()
    }
}

function Start-PortForward {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Namespace,
        [Parameter(Mandatory = $true)][string]$Resource,
        [Parameter(Mandatory = $true)][string]$Mapping,
        [Parameter(Mandatory = $true)][int]$LocalPort
    )

    if (-not (Test-LocalPortAvailable -Port $LocalPort)) {
        Write-Warning "Skipping $Name port-forward: localhost:$LocalPort is already in use."
        return
    }

    $kubectlPath = (Get-Command kubectl -ErrorAction Stop).Source
    $stdoutPath = Join-Path $env:TEMP "city-guide-$Name-port-forward.out.log"
    $stderrPath = Join-Path $env:TEMP "city-guide-$Name-port-forward.err.log"
    $arguments = @(
        '--address', '127.0.0.1',
        '-n', $Namespace,
        'port-forward', $Resource, $Mapping
    )
    $process = Start-Process `
        -FilePath $kubectlPath `
        -ArgumentList $arguments `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath

    $script:forwardProcesses += [pscustomobject]@{
        name = $Name
        processId = $process.Id
        startedUtc = $process.StartTime.ToUniversalTime().ToString('o')
    }
    Write-Host "Port-forward started: $Name -> http://localhost:$LocalPort (PID $($process.Id))"
}

Write-Host 'Starting Minikube...'
Invoke-Checked -Command 'minikube' -Arguments @('start')
Invoke-Checked -Command 'minikube' -Arguments @('addons', 'enable', 'ingress')
Invoke-Checked -Command 'kubectl' -Arguments @('config', 'use-context', 'minikube')

Write-Host 'Building application images directly in Minikube...'
Invoke-Checked -Command 'minikube' -Arguments @('image', 'build', '--tag=city-backend:lf', '.\backend')
Invoke-Checked -Command 'minikube' -Arguments @('image', 'build', '--tag=city-prober:lf', '.\backend')
Invoke-Checked -Command 'minikube' -Arguments @('image', 'build', '--tag=city-frontend:api-proxy', '.\frontend')

Write-Host 'Applying application and monitoring resources...'
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\namespace.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @(
    'apply', '-f', '.\k8s\configmap.yaml', '-f', '.\k8s\secret.yaml', '-f', '.\k8s\pvc.yaml'
)
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\postgres.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\api.yaml', '-f', '.\k8s\frontend.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\ingress.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\victoria-logs.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\prober.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'restart', 'deployment/api'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'restart', 'deployment/frontend'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'restart', 'deployment/api-prober'
)

Write-Host 'Installing VictoriaMetrics and vmagent...'
Invoke-Checked -Command 'helm' -Arguments @(
    'repo', 'add', 'vm', 'https://victoriametrics.github.io/helm-charts/', '--force-update'
)
Invoke-Checked -Command 'helm' -Arguments @('repo', 'update', 'vm')
Invoke-Checked -Command 'helm' -Arguments @(
    'upgrade', '--install', 'vm-single', 'vm/victoria-metrics-single',
    '--namespace', 'monitoring', '--create-namespace',
    '--values', '.\k8s\victoria-metrics-values.yaml'
)
Invoke-Checked -Command 'kubectl' -Arguments @('apply', '-f', '.\k8s\vmagent.yaml')
Invoke-Checked -Command 'kubectl' -Arguments @('rollout', 'restart', 'deployment/vmagent', '-n', 'monitoring')

Write-Host 'Waiting for workloads...'
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'deployment/postgres', '--timeout=240s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'deployment/api', '--timeout=240s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'deployment/frontend', '--timeout=180s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'deployment/api-prober', '--timeout=180s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'deployment/victoria-logs', '--timeout=180s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'cityguide', 'rollout', 'status', 'daemonset/vlagent', '--timeout=180s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'monitoring', 'rollout', 'status', 'statefulset/vm-single-victoria-metrics-single-server', '--timeout=240s'
)
Invoke-Checked -Command 'kubectl' -Arguments @(
    '-n', 'monitoring', 'rollout', 'status', 'deployment/vmagent', '--timeout=180s'
)

$script:forwardProcesses = @()
Start-PortForward -Name 'frontend' -Namespace 'cityguide' -Resource 'svc/frontend' -Mapping '8080:80' -LocalPort 8080
Start-PortForward -Name 'api' -Namespace 'cityguide' -Resource 'svc/api' -Mapping '8000:8000' -LocalPort 8000
Start-PortForward -Name 'api-prober' -Namespace 'cityguide' -Resource 'deployment/api-prober' -Mapping '8001:8001' -LocalPort 8001
Start-PortForward -Name 'postgres-metrics' -Namespace 'cityguide' -Resource 'svc/postgres' -Mapping '9187:9187' -LocalPort 9187
Start-PortForward -Name 'victoriametrics' -Namespace 'monitoring' -Resource 'svc/vm-single-victoria-metrics-single-server' -Mapping '8428:8428' -LocalPort 8428
Start-PortForward -Name 'vmagent' -Namespace 'monitoring' -Resource 'svc/vmagent' -Mapping '8429:8429' -LocalPort 8429
Start-PortForward -Name 'victorialogs' -Namespace 'cityguide' -Resource 'svc/victoria-logs' -Mapping '9428:9428' -LocalPort 9428

$pidFile = Join-Path $env:TEMP 'city-guide-minikube-forwards.json'
$script:forwardProcesses | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding utf8

Write-Host ''
Write-Host 'City Guide is ready:'
Write-Host '  App:            http://localhost:8080'
Write-Host '  API docs:       http://localhost:8000/docs'
Write-Host '  Prober metrics: http://localhost:8001/metrics'
Write-Host '  DB metrics:     http://localhost:9187/metrics'
Write-Host '  VictoriaMetrics http://localhost:8428/vmui/'
Write-Host '  vmagent targets http://localhost:8429/targets'
Write-Host '  VictoriaLogs:   http://localhost:9428/select/vmui/'
Write-Host 'Forward process IDs are saved in the temporary directory.'
Write-Host 'Run .\scripts\stop-port-forwards.ps1 to stop only these port-forwards.'
