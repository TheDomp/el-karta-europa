import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';

const PORT = 3001;
const TARGET_HOST = 'web-api.tp.entsoe.eu';

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    try { fs.appendFileSync('proxy_server.log', line); } catch (e) { }
};

const server = http.createServer((req, res) => {
    log(`Request: ${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Explicitly set Content-Type to XML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let query = req.url.split('?')[1] || '';
    const targetUrl = `https://${TARGET_HOST}/api?${query}`;

    log(`Fetching via CURL: ${targetUrl}`);

    try {
        const curl = spawn('curl', ['-s', targetUrl]);

        curl.stdout.pipe(res);

        curl.stderr.on('data', (data) => {
            log(`Curl Error: ${data}`);
        });

        curl.on('close', (code) => {
            log(`Curl exited with code ${code}`);
            if (!res.writableEnded) res.end();
        });
    } catch (e) {
        log(`Spawn Error: ${e.message}`);
        res.writeHead(500);
        res.end(e.message);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    log(`Proxy server listening on http://127.0.0.1:${PORT}`);
});
