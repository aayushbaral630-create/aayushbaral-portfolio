const fetch = require('node-fetch');

async function testEmail() {
    const payload = {
        service_id: 'service_f83v5ag',
        template_id: 'template_kvfzil',
        user_id: '73PBfjTI_iqodN5vM',
        template_params: {
            name: 'Test Name',
            email: 'test@example.com',
            service: 'website',
            message: 'This is a test message from node.'
        }
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

testEmail();
