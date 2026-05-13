[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$baseUrl = "https://raw.githubusercontent.com/vladmandic/face-api/master/model"
$modelsDir = "d:\MOCKFPT\fpt_mock_frontend\public\models"

if (-Not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
}

$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1"
)

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $dest = "$modelsDir\$file"
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $dest
}
Write-Host "Download complete!"
