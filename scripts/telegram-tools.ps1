# Agents Office - the only commands the Telegram session may run. One script, a short list of verbs, each one narrow and logged.
# The Telegram listener (scripts/telegram-channel.ps1) answers Wesley's allow-listed chat; CLAUDE.md says when to use which verb.
#
#   status                     the office, Docker/OpenWA and the PC in one line each
#   waiting | matrix | routines     what is waiting on Wesley, the open matrix actions, the timetable (read only)
#   ask <text...>              talk to the Chief of Staff: questions, and requests ("make me a Reel on pricing", "what's going out this week"). It adds tasks and runs routines; it cannot approve, send or post.
#   task <dept> <text...>      puts a task on the office board; it waits for Wesley's review like any other
#   sleep                      puts the PC to sleep (the scheduled 06:55 wake still fires)
#   shutdown -Confirmed        turns the PC off after 30 seconds. Refused without -Confirmed. 'abort' cancels it.
#   abort                      cancels a pending shutdown
param([Parameter(Mandatory, Position = 0)][ValidateSet('status', 'waiting', 'matrix', 'routines', 'ask', 'task', 'sleep', 'shutdown', 'abort')][string]$Verb,
      [Parameter(ValueFromRemainingArguments)][string[]]$Rest, [switch]$Confirmed)
$ErrorActionPreference = 'Stop'
$office = 'http://localhost:4520'
$logDir = Join-Path $env:USERPROFILE '.claude\channels\telegram'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'telegram-tools.log'
function Log($m) { (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m | Out-File -FilePath $log -Append -Encoding utf8 }
function Get-Office($p) { Invoke-RestMethod -Uri ($office + $p) -TimeoutSec 20 }
function Post-Office($p, $obj) { Invoke-RestMethod -Method Post -Uri ($office + $p) -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 5))) -TimeoutSec 240 }
$text = ($Rest -join ' ').Trim()
Log "$Verb $(if ($text) { $text.Substring(0, [Math]::Min(80, $text.Length)) })$(if ($Confirmed) { ' [confirmed]' })"

switch ($Verb) {
    'status' {
        try { $h = Get-Office '/api/health'; "Office: up, v$($h.version)" } catch { 'Office: NOT reachable on port 4520' }
        try { $d = docker ps --format '{{.Names}} {{.Status}}' 2>$null | Where-Object { $_ -match 'openwa-api' }; if ($d) { "OpenWA: $d" } else { 'OpenWA: not running' } } catch { 'OpenWA: Docker not reachable' }
        $up = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; "PC: up $([int]$up.TotalHours) h $($up.Minutes) min"
        try { $s = Get-Office '/api/storage'; "Disk: $($s.freeGB) GB free of $($s.totalGB) GB; the office's own files $([int]$s.officeMB) MB" + $(if ($s.warn -and $s.warn.Count) { ' - ' + ($s.warn -join ' ') } else { '' }) } catch { }
    }
    'waiting' {
        $t = Get-Office '/api/tasks' | Where-Object { $_.state -eq 'waiting' }
        if (-not $t) { 'Nothing is waiting on your OK.' } else { $t | ForEach-Object { "- $($_.title) ($($_.agent))" } }
    }
    'matrix' {
        $m = Get-Office '/api/matrix'; $open = $m.items | Where-Object { $_.state -eq 'open' }
        'Do now:'; $open | Where-Object { $_.q -eq 'do' } | Select-Object -First 8 | ForEach-Object { "- $($_.title)" }
        "Open in total: $(@($open).Count)"
    }
    'routines' {
        (Get-Office '/api/routines').routines | Where-Object { -not $_.paused } | ForEach-Object { "- $($_.title)" }
    }
    'ask' {
        if (-not $text) { throw 'ask needs a question' }
        (Post-Office '/api/assistant' @{ text = $text; surface = 'telegram'; stream = $false }).reply   # the Chief of Staff: the same conversation as the side panel
    }
    'task' {
        $dept, $body = $Rest[0], (($Rest | Select-Object -Skip 1) -join ' ').Trim()
        if (-not $dept -or -not $body) { throw 'task needs a department and the text' }
        $r = Post-Office '/api/tasks' @{ dept = $dept; text = $body }
        "Added to the board as '$($r.title)' ($($r.agent)). It waits for your review in the office."
    }
    'sleep' {
        Log 'sleep requested'
        Start-Process -WindowStyle Hidden -FilePath rundll32.exe -ArgumentList 'powrprof.dll,SetSuspendState 0,1,0'
        'Going to sleep now. The scheduled 06:55 wake will still bring it back.'
    }
    'shutdown' {
        if (-not $Confirmed) { 'Refused: shutdown needs -Confirmed, after Wesley has replied to confirm it.'; exit 2 }
        Log 'shutdown confirmed'
        shutdown /s /t 30 /c 'Shutdown requested from Telegram. Send ABORT to cancel.'
        'Shutting down in 30 seconds. Say ABORT to cancel. Note: Telegram cannot turn it back on.'
    }
    'abort' { shutdown /a 2>$null; 'Any pending shutdown is cancelled.' }
}
