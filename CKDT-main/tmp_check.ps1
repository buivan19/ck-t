Write-Host '--- Get-Service mysql ---'
Get-Service *mysql* -ErrorAction SilentlyContinue | Format-Table Name,DisplayName,Status -AutoSize

Write-Host '--- Netstat :3306 ---'
netstat -ano | findstr :3306

Write-Host '--- Tasklist mysqld.exe ---'
tasklist /FI "IMAGENAME eq mysqld.exe"

Write-Host '--- Search Program Files for mysqld.exe (fast) ---'
if (Test-Path 'C:\Program Files\MySQL') {
  Get-ChildItem 'C:\Program Files\MySQL' -Recurse -Filter mysqld.exe -ErrorAction SilentlyContinue | Select-Object FullName
} else {
  Write-Host 'No MySQL folder in Program Files'
}
