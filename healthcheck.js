import http from 'http';
const options = { host: 'localhost', port: process.env.PORT || 9000, path: '/api/health', timeout: 5000 };
const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });
req.on('error', () => process.exit(1));
req.end();
