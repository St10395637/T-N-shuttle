import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../server.mjs";

test("serves the homepage and health endpoint", async (context) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const [home, health] = await Promise.all([
    fetch(base),
    fetch(`${base}/api/health`),
  ]);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(await home.text(), /Good journeys/);
  assert.deepEqual(await health.json(), { ok: true, service: "thabang-shuttle" });

  const head = await fetch(base, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("validates booking requests without claiming to persist them", async (context) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "PLK",
      to: "PTA",
      date: today,
      time: "09:30",
      name: "Ada Example",
      phone: "079 123 4567",
      passengers: 1,
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 202);
  assert.equal(result.ok, true);
  assert.equal(result.persisted, false);
  assert.ok(result.reference);
});

test("returns actionable validation errors for invalid booking requests", async (context) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: "PLK", to: "PLK" }),
  });
  const result = await response.json();
  assert.equal(response.status, 400);
  assert.equal(result.error, "Please correct the booking details.");
  assert.ok(result.fields.to);
});
