const { createServer } = require('./app');

const port = Number(process.env.PORT) || 3000;
const server = createServer();

server.listen(port, () => {
  process.stdout.write(`Server running on http://localhost:${port}\n`);
});
