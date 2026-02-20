$baseUrl = "http://localhost:3000/api"

# Helper function to get random string
function Get-RandomString {
    return -join ((65..90) + (97..122) | Get-Random -Count 5 | % { [char]$_ })
}

$pin = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
$name = "Archive Test User " + (Get-RandomString)

Write-Host "Creating Firefighter: $name (PIN: $pin)..." -ForegroundColor Cyan
try {
    # 1. Get a Role ID
    $roles = Invoke-RestMethod "$baseUrl/roles"
    if ($roles.Count -eq 0) {
        Write-Error "No roles found. Please create a role first."
        exit
    }
    $roleId = $roles[0].id

    # 2. Create Firefighter
    $ff = Invoke-RestMethod "$baseUrl/firefighters" -Method Post -Body (@{
            name   = $name
            pin    = $pin
            roleId = $roleId
        } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "Firefighter Created: $($ff.id)" -ForegroundColor Green

    # 3. Clock In
    Write-Host "Clocking In..." -ForegroundColor Cyan
    $clockIn = Invoke-RestMethod "$baseUrl/clock-in" -Method Post -Body (@{
            pin = $pin
        } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Clocked In. Entry ID: $($clockIn.id)" -ForegroundColor Green

    # 4. Check API - Should be visible
    Write-Host "Checking Time Entries (Active)..." -ForegroundColor Cyan
    $entries = Invoke-RestMethod "$baseUrl/time-entries"
    $found = $entries | Where-Object { $_.firefighterId -eq $ff.id }
    if ($found) {
        Write-Host "SUCCESS: Entry found for active user." -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Entry NOT found for active user."
    }

    # 5. Archive Firefighter
    Write-Host "Archiving Firefighter..." -ForegroundColor Cyan
    $updatedFF = Invoke-RestMethod "$baseUrl/firefighters/$($ff.id)" -Method Put -Body (@{
            isActive = $false
            name     = $ff.name # API requires name
            roleId   = $ff.roleId
            pin      = $ff.pin
        } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Firefighter Archived." -ForegroundColor Yellow

    # 6. Check API - Should be HIDDEN
    Write-Host "Checking Time Entries (Archived)..." -ForegroundColor Cyan
    $entriesArchived = Invoke-RestMethod "$baseUrl/time-entries"
    $foundArchived = $entriesArchived | Where-Object { $_.firefighterId -eq $ff.id }
    if (-not $foundArchived) {
        Write-Host "SUCCESS: Entry HIDDEN for archived user." -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Entry STILL VISIBLE for archived user."
    }

    # 7. Unarchive Firefighter
    Write-Host "Restoring Firefighter..." -ForegroundColor Cyan
    $restoredFF = Invoke-RestMethod "$baseUrl/firefighters/$($ff.id)" -Method Put -Body (@{
            isActive = $true
            name     = $ff.name
            roleId   = $ff.roleId
            pin      = $ff.pin
        } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Firefighter Restored." -ForegroundColor Green

    # 8. Check API - Should be VISIBLE again
    Write-Host "Checking Time Entries (Restored)..." -ForegroundColor Cyan
    $entriesRestored = Invoke-RestMethod "$baseUrl/time-entries"
    $foundRestored = $entriesRestored | Where-Object { $_.firefighterId -eq $ff.id }
    if ($foundRestored) {
        Write-Host "SUCCESS: Entry visible again for restored user." -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Entry NOT visible for restored user."
    }

}
catch {
    Write-Error "An error occurred: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Error "Server Response: $($reader.ReadToEnd())"
    }
}
