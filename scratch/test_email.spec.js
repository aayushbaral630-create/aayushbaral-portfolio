const { test, expect } = require('@playwright/test');

test('submit form and intercept EmailJS request', async ({ page }) => {
    // Navigate to the local server
    await page.goto('http://localhost:3000');

    // Intercept the API call to EmailJS
    const requestPromise = page.waitForRequest(request => 
        request.url().includes('api.emailjs.com/api/v1.0/email/send') && request.method() === 'POST'
    );

    // Fill the form
    await page.fill('#name', 'Playwright Tester');
    await page.fill('#email', 'tester@playwright.com');
    await page.selectOption('#service', 'website');
    await page.fill('#message', 'This is an automated test to debug template variables.');

    // Submit the form
    await page.click('.custom-submit');

    // Wait for the request
    const request = await requestPromise;
    const postData = JSON.parse(request.postData());

    console.log("PAYLOAD SENT TO EMAILJS:");
    console.log(JSON.stringify(postData, null, 2));
});
