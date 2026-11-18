[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$Path = '/api/cities',
    [ValidateRange(1, 10000)][int]$Count = 30,
    [ValidateRange(0, 60000)][int]$DelayMs = 150,
    [string]$Audience
)

$ErrorActionPreference = 'Stop'
$pathSuffix = if ($Path.StartsWith('/')) { $Path } else { "/$Path" }
$uri = '{0}{1}' -f $BaseUrl.TrimEnd('/'), $pathSuffix
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$results = [System.Collections.Generic.List[object]]::new()

try {
    for ($i = 1; $i -le $Count; $i++) {
        $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $uri)
        $response = $null

        if (-not [string]::IsNullOrWhiteSpace($Audience)) {
            $null = $request.Headers.TryAddWithoutValidation('x-audience', $Audience)
        }

        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = $client.SendAsync($request).GetAwaiter().GetResult()
            $timer.Stop()

        [System.Collections.Generic.IEnumerable[string]]$versionValues = $null
        [System.Collections.Generic.IEnumerable[string]]$podValues = $null
            $null = $response.Headers.TryGetValues('X-CityGuide-Version', [ref]$versionValues)
            $null = $response.Headers.TryGetValues('X-CityGuide-Pod', [ref]$podValues)

            $version = if ($versionValues.Count) { $versionValues[0] } else { 'unknown' }
            $pod = if ($podValues.Count) { $podValues[0] } else { 'unknown' }
            $result = [pscustomobject]@{
                Version = $version
                Pod = $pod
                Status = [int]$response.StatusCode
                ElapsedMs = [math]::Round($timer.Elapsed.TotalMilliseconds, 1)
            }
            $results.Add($result)
            Write-Host ('[{0,3}/{1}] HTTP {2}  version={3}  pod={4}  {5} ms' -f `
                $i, $Count, $result.Status, $result.Version, $result.Pod, $result.ElapsedMs)
        }
        finally {
            if ($null -ne $response) { $response.Dispose() }
            $request.Dispose()
        }

        if ($DelayMs -gt 0 -and $i -lt $Count) {
            Start-Sleep -Milliseconds $DelayMs
        }
    }
}
finally {
    $client.Dispose()
}

Write-Host ''
Write-Host 'Requests per backend:'
$results |
    Group-Object { '{0} / {1}' -f $_.Version, $_.Pod } |
    Sort-Object Name |
    ForEach-Object { Write-Host ('{0}: {1}' -f $_.Name, $_.Count) }
