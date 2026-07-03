$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Serving ZenMeat from $root on http://0.0.0.0:$port"
Set-Location $root
python -m http.server $port