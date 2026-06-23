'use strict';
const https  = require('https');
const http   = require('http');
const { URL } = require('url');

function get(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(url); } catch(e) { return reject(new Error(`Invalid URL: ${url}`)); }
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, { timeout: 10000 }, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return get(new URL(res.headers.location, url).toString(), redirectsLeft - 1)
          .then(resolve).catch(reject);
      }
      let body = '';
      let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size < 2 * 1024 * 1024) body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, url }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timed out fetching ${url}`)); });
  });
}

module.exports = { get };
