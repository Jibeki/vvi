const http = require('node:http');
const { parse } = require('node:querystring');

const videos = [];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPage() {
  const items = videos
    .map(({ title, url }) => {
      const safeTitle = escapeHtml(title);
      const safeUrl = escapeHtml(url);
      return `<li><h2>${safeTitle}</h2><video controls preload="metadata" width="480" src="${safeUrl}"></video></li>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>VVI Video Hosting</title>
  </head>
  <body>
    <h1>VVI Video Hosting</h1>
    <form method="post" action="/videos">
      <label>Title <input name="title" required /></label>
      <label>Video URL <input name="url" type="url" required /></label>
      <button type="submit">Add video</button>
    </form>
    <ul>${items}</ul>
  </body>
</html>`;
}

function isSafeVideoUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderPage());
      return;
    }

    if (req.method === 'POST' && req.url === '/videos') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) {
          req.destroy();
        }
      });

      req.on('end', () => {
        const { title = '', url = '' } = parse(body);
        const normalizedTitle = String(title).trim();
        const normalizedUrl = String(url).trim();

        if (!normalizedTitle || !isSafeVideoUrl(normalizedUrl)) {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Invalid title or video URL');
          return;
        }

        videos.push({ title: normalizedTitle, url: normalizedUrl });
        res.writeHead(303, { location: '/' });
        res.end();
      });

      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });
}

module.exports = { createServer, videos };
