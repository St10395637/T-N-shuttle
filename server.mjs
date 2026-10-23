import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBooking } from "./src/booking-validation.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(projectRoot, "public");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 16 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function serveStatic(pathname, request, response) {
  let requestedPath;
  try {
    requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  } catch {
    sendJson(response, 404, { error: "Not found." });
    return;
  }
  const filePath = resolve(publicRoot, `.${requestedPath}`);

  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    const [root, actualPath] = await Promise.all([realpath(publicRoot), realpath(filePath)]);
    if (actualPath !== root && !actualPath.startsWith(`${root}${sep}`)) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    const content = await readFile(actualPath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(actualPath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR" || error instanceof URIError) {
      sendJson(response, 404, { error: "Not found." });
      return;
    }
    throw error;
  }
}

export function createAppServer() {
  return createServer(async (request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, "http://localhost").pathname;
    } catch {
      sendJson(response, 400, { error: "Invalid request URL." });
      return;
    }

    if (pathname === "/api/health") {
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        sendJson(response, 405, { error: "Method not allowed." });
        return;
      }
      sendJson(response, 200, { ok: true, service: "thabang-shuttle" });
      return;
    }

    if (pathname === "/api/bookings") {
      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Method not allowed." });
        return;
      }
      if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Content-Type must be application/json." });
        return;
      }

      try {
        const payload = await readJsonBody(request);
        const validation = validateBooking(payload);
        if (!validation.ok) {
          sendJson(response, 400, { error: "Please correct the booking details.", fields: validation.errors });
          return;
        }

        sendJson(response, 202, {
          ok: true,
          reference: randomUUID(),
          persisted: false,
          message: "Details validated. Send the prepared WhatsApp message to contact T&A Shuttle and confirm your request.",
        });
      } catch (error) {
        sendJson(response, error.statusCode || 500, {
          error: error.statusCode ? error.message : "Unable to process this request.",
        });
      }
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      await serveStatic(pathname, request, response);
    } catch (error) {
      console.error("Static file request failed:", error);
      sendJson(response, 500, { error: "Unable to load this page." });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`T&A Shuttle is listening on port ${port}`);
  });
}
