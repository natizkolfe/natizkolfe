/**
 * cPanel / TMDHosting Node.js Selector entrypoint.
 * Uses process.env.PORT from the host. Do not hardcode a port.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling", req.url, err);
        res.statusCode = 500;
        res.end("internal server error");
      }
    }).listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`Gebeta ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start Gebeta", err);
    process.exit(1);
  });
