const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer, videos, resetVideos } = require('../app');

function request(port, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port,
      ...options
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

test.beforeEach(() => {
  resetVideos();
});

test('GET / renders video hosting page', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const address = server.address();
  const res = await request(address.port, { path: '/', method: 'GET' });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /VVI Video Hosting/);
});

test('POST /videos stores a valid video URL', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const address = server.address();
  const res = await request(
    address.port,
    {
      path: '/videos',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    },
    'title=Demo+Clip&url=https%3A%2F%2Fexample.com%2Fdemo.mp4'
  );

  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.location, '/');

  const home = await request(address.port, { path: '/', method: 'GET' });
  assert.match(home.body, /Demo Clip/);
  assert.match(home.body, /https:\/\/example.com\/demo.mp4/);
});

test('POST /videos rejects invalid URL protocols', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const address = server.address();
  const res = await request(
    address.port,
    {
      path: '/videos',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    },
    'title=Bad+Clip&url=javascript%3Aalert(1)'
  );

  assert.equal(res.statusCode, 400);
  assert.equal(videos.length, 0);
});

test('POST /videos rejects repeated form values', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => server.close());

  const address = server.address();
  const res = await request(
    address.port,
    {
      path: '/videos',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    },
    'title=One&title=Two&url=https%3A%2F%2Fexample.com%2Fdemo.mp4'
  );

  assert.equal(res.statusCode, 400);
  assert.equal(videos.length, 0);
});
