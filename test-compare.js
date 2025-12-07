
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testCompare() {
    console.log('Creating dummy files...');
    fs.writeFileSync('docA.txt', 'This agreement is between Party A and Party B. Liability is limited to $1000. Jurisdiction: New York.');
    fs.writeFileSync('docB.txt', 'This agreement is between Party A and Party B. Liability is limited to $5000. Jurisdiction: California.');

    const form = new FormData();
    form.append('fileA', fs.createReadStream('docA.txt'));
    form.append('fileB', fs.createReadStream('docB.txt'));

    console.log('Sending request to /api/compare...');
    try {
        const response = await fetch('http://localhost:3000/api/compare', {
            method: 'POST',
            body: form,
            headers: form.getHeaders ? form.getHeaders() : {}
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Raw Response:', text);
    } catch (error) {
        console.error('Fetch error:', error);
    }

    // Cleanup
    fs.unlinkSync('docA.txt');
    fs.unlinkSync('docB.txt');
}

testCompare();
