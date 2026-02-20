$baseUrl = "http://localhost:3000/api"

# 1. Create a Test Firefighter
Write-Host "Creating Test Firefighter..."
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$pin = "TEST-$timestamp"
$roleId = (Invoke-RestMethod "$baseUrl/roles" | Select-Object -First 1).id

try {
    $ff = Invoke-RestMethod -Uri "$baseUrl/firefighters" -Method Post -Body (@{
            name   = "Archive Test User"
            roleId = $roleId
            pin    = $pin
        } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "Created Firefighter: $($ff.name) (ID: $($ff.id))" -ForegroundColor Green
}
catch {
    Write-Error "Failed to create firefighter: $_"
    exit
}

# 2. Archive the Firefighter
Write-Host "Archiving Firefighter..."
try {
    $updated = Invoke-RestMethod -Uri "$baseUrl/firefighters/$($ff.id)" -Method Put -Body (@{
            name      = $ff.name
            roleId    = $ff.roleId
            stationId = $ff.stationId
            pin       = $ff.pin
            isActive  = $false
        } | ConvertTo-Json) -ContentType "application/json"
    
    if ($updated.isActive -eq $false) {
        Write-Host "SUCCESS: Firefighter is now inactive." -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Firefighter isActive is still true."
    }
}
catch {
    Write-Error "Failed to archive firefighter: $_"
}

# 3. Try to Clock In (Should Fail)
Write-Host "Attempting Clock In (Should Fail)..."
try {
    Invoke-RestMethod -Uri "$baseUrl/clock-in" -Method Post -Body (@{
            pin = $pin
        } | ConvertTo-Json) -ContentType "application/json"
    
    Write-Error "FAILURE: Clock In should have been rejected."
}
catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "SUCCESS: Clock In rejected (403 Forbidden)." -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Unexpected error code: $($_.Exception.Response.StatusCode)"
    }
}

# 4. Restore Firefighter
Write-Host "Restoring Firefighter..."
try {
    $restored = Invoke-RestMethod -Uri "$baseUrl/firefighters/$($ff.id)" -Method Put -Body (@{
            name      = $ff.name
            roleId    = $ff.roleId
            stationId = $ff.stationId
            pin       = $ff.pin
            isActive  = $true
        } | ConvertTo-Json) -ContentType "application/json"
    
    if ($restored.isActive -eq $true) {
        Write-Host "SUCCESS: Firefighter is active again." -ForegroundColor Green
    }
}
catch {
    Write-Error "Failed to restore firefighter: $_"
}

# 5. Try to Clock In (Should Succeed)
Write-Host "Attempting Clock In (Should Succeed)..."
try {
    $entry = Invoke-RestMethod -Uri "$baseUrl/clock-in" -Method Post -Body (@{
            pin = $pin
        } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "SUCCESS: Clock In accepted." -ForegroundColor Green
    
    # Cleanup: Clock out and delete
    Start-Sleep -Milliseconds 1000 # Wait a bit
    Invoke-RestMethod -Uri "$baseUrl/clock-out" -Method Post -Body (@{ pin = $pin } | ConvertTo-Json) -ContentType "application/json" > $null
}
catch {
    Write-Error "Failed to clock in after restore: $_"
}

# Cleanup
Invoke-RestMethod -Uri "$baseUrl/firefighters/$($ff.id)" -Method Delete > $null
Write-Host "Cleanup complete."
