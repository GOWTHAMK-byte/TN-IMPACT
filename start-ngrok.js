const ngrok = require('@ngrok/ngrok');
const fs = require('fs');

(async function () {
    try {
        const listener = await ngrok.forward({
            addr: 5000,
            authtoken: '31ja8xvyEO0uMUyKPTaakmfBIGU_3DLDRkisoPWJeUKfsVFzp'
        });
        const url = listener.url();
        fs.writeFileSync('ngrok-url.txt', url);
        console.log(`Tunnel created: ${url}`);

        // Keep alive
        process.stdin.resume();
    } catch (err) {
        console.error("ngrok error:", err);
        process.exit(1);
    }
})();
