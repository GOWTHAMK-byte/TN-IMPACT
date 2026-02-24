import ngrok from '@ngrok/ngrok';
import * as fs from 'fs';

async function main() {
    const listener = await ngrok.connect({
        addr: 5000,
        authtoken: '31ja8xvyEO0uMUyKPTaakmfBIGU_3DLDRkisoPWJeUKfsVFzp',
    });

    const url = listener.url() || '';

    // Write the full URL to a dedicated file for easy retrieval
    fs.writeFileSync('ngrok-url.txt', url);

    console.log('\n\n========================================');
    console.log(`🚀 ngrok tunnel URL: ${url}`);
    console.log('========================================\n\n');
    console.log('Use this URL as your backend base URL!');
    console.log(`Add to Google OAuth redirect URIs: ${url}/api/auth/google/callback`);
    console.log('\nPress Ctrl+C to stop the tunnel.');

    // Keep the process alive
    await new Promise(() => { });
}

main().catch(err => {
    console.error('Failed to start ngrok:', err);
    process.exit(1);
});
