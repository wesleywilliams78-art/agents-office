# Agents Office - runs when Windows wakes the PC on its scheduled wake timer.
# Sleep can leave the Telegram bot's network connection stale even though the
# process itself survives suspension. This kills the current
# "claude --channels ..." process (and its bun child) so the always-running
# watchdog loop (scripts/telegram-channel.ps1) notices it exited and
# relaunches it with a fresh connection within 10 seconds.

Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'claude.exe' -and $_.CommandLine -match '--channels plugin:telegram'
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'bun.exe' -and $_.CommandLine -match 'telegram'
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
