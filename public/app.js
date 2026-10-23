const form = document.querySelector("#booking-form");
const from = document.querySelector("#from");
const to = document.querySelector("#to");
const dateInput = document.querySelector("#date");
const errorBox = document.querySelector("#form-error");
const successBox = document.querySelector("#form-success");
const submitButton = form.querySelector('button[type="submit"]');
const towns = { PLK: "Polokwane", PTA: "Pretoria", JHB: "Johannesburg" };
const whatsappContacts = [
  { number: "27794424351", label: "079 442 4351" },
  { number: "27678436724", label: "067 843 6724" },
];

function localDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

dateInput.min = localDateString(new Date());
document.querySelector("#year").textContent = new Date().getFullYear();

const menuToggle = document.querySelector("#menu-toggle");
const navLinks = document.querySelector("#nav-links");
menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  navLinks.classList.toggle("is-open", open);
});
navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }
});

for (const select of [from, to]) {
  select.addEventListener("change", () => {
    const other = select === from ? to : from;
    for (const option of other.options) {
      option.disabled = Boolean(select.value) && option.value === select.value;
    }
  });
}

document.querySelectorAll(".route-card").forEach((card) => {
  card.addEventListener("click", () => {
    from.value = card.dataset.from;
    to.value = card.dataset.to;
    from.dispatchEvent(new Event("change"));
    to.dispatchEvent(new Event("change"));
    document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
    from.focus({ preventScroll: true });
  });
});

function showErrors(errors) {
  const messages = Object.values(errors || {});
  errorBox.textContent = messages.length ? messages.join(" ") : "We couldn't validate this request. Please check your details and try again.";
  errorBox.hidden = false;
  successBox.hidden = true;
}

function formatTripDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function closeWhatsAppWindows(windows) {
  for (const whatsappWindow of windows) {
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  successBox.hidden = true;
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const booking = Object.fromEntries(data.entries());
  booking.passengers = Number(booking.passengers);
  const originalLabel = submitButton.innerHTML;
  let whatsappWindows = [];
  submitButton.disabled = true;
  submitButton.innerHTML = "<span>Checking your details…</span>";

  try {
    whatsappWindows = whatsappContacts.map(() => window.open("about:blank", "_blank"));
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    const result = await response.json();
    if (!response.ok) {
      closeWhatsAppWindows(whatsappWindows);
      showErrors(result.fields || { form: result.error || "Unable to process this request." });
      return;
    }

    const message = [
      "Hi T&A Shuttle, I would like to request a shuttle booking.",
      `From: ${towns[booking.from]} (${booking.from})`,
      `To: ${towns[booking.to]} (${booking.to})`,
      `Pick-up address: ${booking.pickup || "-"}`,
      `Drop-off address: ${booking.dropoff || "-"}`,
      `Date: ${formatTripDate(booking.date)}`,
      `Preferred time: ${booking.time}`,
      `Passengers: ${booking.passengers}`,
      `Name: ${booking.name.trim()}`,
      `Phone: ${booking.phone.trim()}`,
      `Notes: ${booking.notes?.trim() || "-"}`,
      `Request reference: ${result.reference}`,
    ].join("\n");
    successBox.replaceChildren();
    const text = document.createElement("p");
    text.textContent = "Your browser may open WhatsApp chats automatically. Review the message and press Send in each chat. If a chat does not open, use its button below.";
    const contacts = document.createElement("div");
    contacts.className = "whatsapp-contacts";
    for (const [index, contact] of whatsappContacts.entries()) {
      const whatsappLink = `https://wa.me/${contact.number}?text=${encodeURIComponent(message)}`;
      const link = document.createElement("a");
      link.href = whatsappLink;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "button button-navy";
      link.textContent = `WhatsApp ${contact.label} ↗`;
      contacts.append(link);
      if (whatsappWindows[index] && !whatsappWindows[index].closed) {
        whatsappWindows[index].location.href = whatsappLink;
      }
    }
    successBox.append(text, contacts);
    successBox.hidden = false;
  } catch (error) {
    closeWhatsAppWindows(whatsappWindows);
    console.error("Booking request failed:", error);
    showErrors({ form: "We couldn't reach the booking service. Please try again or call 079 442 4351." });
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
  }
});
