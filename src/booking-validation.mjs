const towns = new Set(["PLK", "PTA", "JHB"]);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function text(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isDateTodayOrLater(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value >= today;
}

export function validateBooking(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: { form: "Booking details must be sent as a JSON object." } };
  }

  const errors = {};
  if (!towns.has(payload.from)) errors.from = "Choose a valid pick-up town.";
  if (!towns.has(payload.to)) errors.to = "Choose a valid drop-off town.";
  if (towns.has(payload.from) && payload.from === payload.to) {
    errors.to = "Pick-up and drop-off towns must be different.";
  }
  if (!isDateTodayOrLater(payload.date)) errors.date = "Choose today or a future date.";
  if (typeof payload.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time)) {
    errors.time = "Enter a valid departure time.";
  }
  if (!text(payload.name, 100)) errors.name = "Enter your name (up to 100 characters).";
  if (typeof payload.phone !== "string" || !/^[0-9+\s()-]{9,20}$/.test(payload.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!Number.isInteger(payload.passengers) || payload.passengers < 1 || payload.passengers > 4) {
    errors.passengers = "Passenger count must be between 1 and 4.";
  }

  for (const field of ["pickup", "dropoff", "notes"]) {
    const limit = field === "notes" ? 500 : 200;
    if (own(payload, field) && payload[field] !== "" && !text(payload[field], limit)) {
      errors[field] = `This field must be no longer than ${limit} characters.`;
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, errors: {} };
}
