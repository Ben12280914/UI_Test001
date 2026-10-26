<#
  이지 출근 Trigger — Windows 로그온/잠금해제 시 실행 (Power Automate 없이)

  설치 (사용자 PC, 1회):
    1. 이 파일을 예) C:\Tools\ezi-trigger.ps1 로 저장
    2. 작업 스케줄러 → 작업 만들기
       - 트리거: "로그온할 때" + "워크스테이션 잠금 해제 시"
       - 동작: powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Tools\ezi-trigger.ps1
    3. 환경 변수 EZI_URL, EZI_TRIGGER_SECRET 설정 (secret은 이지 서버의 TRIGGER_WEBHOOK_SECRET)

  하루 한 번만 보내며, 사내망(회사 Wi-Fi/유선/VPN)에 연결되어 이지 서버에 닿을 때만 성공합니다.
  → "사내망 접속 = 출근" 으로 간주하므로 GPS 권한이 필요 없습니다.
#>

$url = $env:EZI_URL            # 예) http://ezi.intra.example:3000
$secret = $env:EZI_TRIGGER_SECRET
if (-not $url -or -not $secret) { exit 0 }

$stamp = Join-Path $env:LOCALAPPDATA "ezi-trigger-$(Get-Date -Format yyyy-MM-dd).flag"
if (Test-Path $stamp) { exit 0 }   # 오늘 이미 보냄

$body = @{
  type       = "GPS_ARRIVAL"
  location   = "Corporate network logon"
  occurredAt = (Get-Date).ToString("o")
  userId     = $env:USERNAME
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "$url/api/triggers/webhook" -TimeoutSec 10 `
    -Headers @{ "x-trigger-secret" = $secret } -ContentType "application/json" -Body $body | Out-Null
  New-Item -ItemType File -Path $stamp -Force | Out-Null
} catch {
  # 사내망이 아니면 조용히 종료 (다음 로그온/잠금해제 때 다시 시도)
  exit 0
}
