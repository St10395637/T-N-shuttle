import test from "node:test";
import assert from "node:assert/strict";
import { validateBooking } from "../src/booking-validation.mjs";

function validBooking(overrides = {}) {
  return {
    from: "PLK",
    to: "PTA",
    date: new Date().toISOString().slice(0, 10),
    time: "09:30",
    name: "Ada Example",
    phone: "079 123 4567",
    passengers: 2,
    pickup: "Polokwane",
    dropoff: "Pretoria",
    notes: "",
    ...overrides,
  };
}

test("accepts a valid booking request", () => {
  assert.deepEqual(validateBooking(validBooking()), { ok: true, errors: {} });
});

test("rejects identical towns", () => {
  const result = validateBooking(validBooking({ to: "PLK" }));
  assert.equal(result.ok, false);
  assert.match(result.errors.to, /different/);
});

test("rejects an invalid town, past date, and passenger count", () => {
  const result = validateBooking(validBooking({
    from: "XYZ",
    date: "2000-01-01",
    passengers: 5,
  }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.from);
  assert.ok(result.errors.date);
  assert.ok(result.errors.passengers);
});

test("rejects malformed payloads and oversized optional fields", () => {
  assert.equal(validateBooking(null).ok, false);
  const result = validateBooking(validBooking({ notes: "x".repeat(501) }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.notes);
});
