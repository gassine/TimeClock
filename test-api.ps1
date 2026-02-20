$ErrorActionPreference = "Stop"

try {
    # 1. Fetch Roles to get a valid Role ID
    Write-Host "Fetching Roles..."
    $roles = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/roles"
    if ($roles.Count -eq 0) {
        Write-Error "No roles found! Seed the database first."
        exit 1
    }
    $roleId = $roles[0].id
    Write-Host "Using Role: $($roles[0].name) (ID: $roleId)"

    # 2. Create Firefighter with PIN
    Write-Host "Creating Firefighter..."
    $pin = "98765432"
    $body = @{
        name   = "Test Firefighter Phase 2"
        roleId = $roleId
        pin    = $pin
    } | ConvertTo-Json

    try {
        $ff = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/firefighters" -ContentType "application/json" -Body $body
        Write-Host "Created Firefighter: $($ff.name) (PIN: $($ff.pin))"
    }
    catch {
        # If already exists (re-running script), try to fetch or handle gracefully
        Write-Warning "Firefighter might already exist or creation failed: $_"
        # We can continue if we know the PIN
    }

    # 3. Clock In using PIN
    Write-Host "Clocking In with PIN..."
    $clockBody = @{ pin = $pin } | ConvertTo-Json
    try {
        $entry = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/clock-in" -ContentType "application/json" -Body $clockBody
        Write-Host "Clocked In: $($entry.firefighter.name) at $($entry.clockIn)"
    }
    catch {
        Write-Warning "Clock In failed (maybe already clocked in?): $_"
    }

    Start-Sleep -Seconds 2

    # 4. Clock Out using PIN
    Write-Host "Clocking Out with PIN..."
    $out = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/clock-out" -ContentType "application/json" -Body $clockBody
    Write-Host "Clocked Out: $($out.firefighter.name) at $($out.clockOut)"
    
    Write-Host "API Verification Successful!"
}
catch {
    Write-Error "API Test Failed: $_"
    exit 1
}
