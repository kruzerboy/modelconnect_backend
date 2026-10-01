const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const rawPort = process.env.PORT || '3000';
const isNumericPort = !isNaN(Number(rawPort));
const listenTarget = isNumericPort ? parseInt(rawPort, 10) : rawPort;

const app = next({ dev, hostname, port: isNumericPort ? listenTarget : 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(listenTarget, () => {
      console.log(`> BookShoot Backend ready on http://${hostname}:${listenTarget}`);
    });
});
