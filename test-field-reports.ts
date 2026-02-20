
async function testFieldReports() {
    const baseUrl = 'http://localhost:3000/api';

    console.log('--- Testing Field Reports API ---');

    console.log('1. Fetching Incident Types...');
    const typesRes = await fetch(`${baseUrl}/incident-types`);
    if (!typesRes.ok) throw new Error('Failed to fetch incident types');
    const types = await typesRes.json();
    const structureFire = types.find((t: any) => t.name === 'Structure Fire');
    if (!structureFire) throw new Error('Structure Fire type not found');
    console.log('Types fetched successfully.');

    console.log('2. Fetching Report Statuses...');
    const statusesRes = await fetch(`${baseUrl}/report-statuses`);
    const statuses = await statusesRes.json();
    const draftStatus = statuses.find((s: any) => s.name === 'Draft');
    console.log('Statuses fetched.');

    // Mock Payload
    const newReport = {
        incidentTypeId: structureFire.id,
        statusId: draftStatus.id,
        date: new Date().toISOString(),
        alarmTime: "14:30",
        location: "123 Main St",
        district: "D-1",
        incidentSummary: "Test structural fire, extinguished.",
        officerInCharge: "Cpt. Test",
        createdByUserId: "cm6u2qam00003v9037466q8j3", // Assuming a valid user ID exists or will fail if FK constraint check
        createdByRadioId: "801",
        assignedApparatus: [] // Empty for now to simplify
    };

    // Need a valid user ID. 
    // Let's first fetch all users to get a valid ID.
    const usersRes = await fetch(`${baseUrl}/firefighters`);
    const users = await usersRes.json();
    if (users.length > 0) {
        newReport.createdByUserId = users[0].id;
        console.log(`Using user ID: ${users[0].id}`);
    } else {
        console.warn('No users found, creation might fail if FK is enforced.');
    }

    console.log('3. Creating Draft Report...');
    const createRes = await fetch(`${baseUrl}/field-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
    });

    const createdReport = await createRes.json();
    if (!createRes.ok) {
        console.error('Create failed:', createdReport);
    } else {
        console.log('Report Created:', createdReport.id);

        console.log('4. Fetching Single Report...');
        const fetchRes = await fetch(`${baseUrl}/field-reports/${createdReport.id}`);
        const fetched = await fetchRes.json();
        console.log('Fetched Report Summary:', fetched.incidentSummary);

        console.log('5. Updating Report...');
        const updateRes = await fetch(`${baseUrl}/field-reports/${createdReport.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentSummary: "Updated Summary" })
        });
        const updated = await updateRes.json();
        console.log('Updated Summary:', updated.incidentSummary);

        // Clean up
        console.log('6. Deleting Report...');
        await fetch(`${baseUrl}/field-reports/${createdReport.id}`, { method: 'DELETE' });
        console.log('Report deleted.');
    }
}

testFieldReports().catch(console.error);
