# Agents Office - keeps exactly one Telegram connector alive: the one that belongs to the listener window (scripts/telegram-channel.ps1).
# A Telegram bot can only be read by one connector at a time, and every Claude desktop session that loads the plugin starts its own,
# which steals messages and answers nothing. This stops any Telegram connector whose parent is not the listener. It does nothing
# when no listener is running, so it can never leave the bot without a connector. Run every two minutes by the
# "AgentsOffice-TelegramSingle" scheduled task.
$all = Get-CimInstance Win32_Process
$byId = @{}; foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
$listener = $all | Where-Object { $_.Name -eq 'claude.exe' -and $_.CommandLine -match '--channels plugin:telegram' } | Select-Object -First 1
if (-not $listener) { exit 0 }
$log = Join-Path $env:USERPROFILE '.claude\channels\telegram\single.log'
foreach ($b in ($all | Where-Object { $_.Name -eq 'bun.exe' -and $_.CommandLine -match 'telegram' })) {
    $p = $b; $mine = $false; $hops = 0
    while ($p -and $hops++ -lt 8) { if ([int]$p.ProcessId -eq [int]$listener.ProcessId) { $mine = $true; break }; $p = $byId[[int]$p.ParentProcessId] }
    if (-not $mine) {
        Stop-Process -Id $b.ProcessId -Force -ErrorAction SilentlyContinue
        (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " stopped extra Telegram connector $($b.ProcessId) (not the listener's)" | Out-File -FilePath $log -Append -Encoding utf8
    }
}
