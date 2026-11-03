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

# 3 Nov 2026: the Telegram plugin is switched off in the user settings so no other Claude session starts a
# connector of its own; this listener switches it back on for itself with telegram-listener.settings.json.
# Claude Code also skips a plugin server for 15 minutes after any session saw it fail (~\.claude\mcp-needs-auth-cache.json),
# which left the listener deaf, so that entry is cleared before every launch.
$settings = Join-Path $PSScriptRoot 'telegram-listener.settings.json'
$failCache = Join-Path $env:USERPROFILE '.claude\mcp-needs-auth-cache.json'
function Clear-TelegramFailure {
    try {
        if (-not (Test-Path $failCache)) { return }
        $c = Get-Content $failCache -Raw | ConvertFrom-Json
        if ($c.PSObject.Properties.Name -contains 'plugin:telegram:telegram') {
            $c.PSObject.Properties.Remove('plugin:telegram:telegram')
            [IO.File]::WriteAllText($failCache, ($c | ConvertTo-Json -Compress -Depth 5))
            Write-Log "cleared a cached Telegram failure"
        }
    } catch { Write-Log ("could not read the failure cache: " + $_.Exception.Message) }
}

Write-Log "watchdog started"
while ($true) {
    Clear-TelegramFailure
    Write-Log "launching claude --channels plugin:telegram@claude-plugins-official"
    claude --settings $settings --channels plugin:telegram@claude-plugins-official
    Write-Log ("claude exited (code " + $LASTEXITCODE + ") - restarting in 10s")
    Start-Sleep -Seconds 10
}
