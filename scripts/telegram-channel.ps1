# Agents Office - keeps the Telegram channel listener alive.
# Launched by the "AgentsOffice-TelegramChannel" scheduled task at logon.
# claude --channels ... only listens for as long as it stays running - if it
# exits (crash, update, network drop) this loop relaunches it after a short
# pause, indefinitely, and logs each restart so a problem is visible later.
#
# Runs from the agents-office repo on purpose: that folder is already marked
# trusted in .claude.json, so claude never stops at the "trust this folder?"
# prompt - which an unattended process can never answer anyway.

$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$Host.UI.RawUI.WindowTitle = "AGENTS OFFICE - Telegram listener (leave running - do not close)"
Set-Location "C:\Users\Wesley\agents-office"
$logDir = Join-Path $env:USERPROFILE '.claude\channels\telegram'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'watchdog.log'

function Write-Log($msg) {
    $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $msg
    $line | Out-File -FilePath $log -Append -Encoding utf8
}

Write-Log "watchdog started"
while ($true) {
    Write-Log "launching claude --channels plugin:telegram@claude-plugins-official"
    claude --channels plugin:telegram@claude-plugins-official
    Write-Log ("claude exited (code " + $LASTEXITCODE + ") - restarting in 10s")
    Start-Sleep -Seconds 10
}
