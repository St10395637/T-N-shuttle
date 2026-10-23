# T&A Shuttle

A responsive shuttle website for travel between Polokwane (PLK), Pretoria (PTA) and Johannesburg (JHB), with a small Node.js booking-request API.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```powershell
npm.cmd run dev
```

Open <http://localhost:3000>. Run the automated tests with:

```powershell
npm.cmd test
```

For production, run `npm.cmd start` and set `PORT` if the hosting provider supplies a port.

## Booking behavior

`POST /api/bookings` validates a JSON booking request and returns a request reference. It does **not** save the request or send it to the business. After validation, the website lets the visitor choose which of the two business numbers to message on WhatsApp. The visitor must review and send the prefilled message. A booking is only confirmed after the business replies.

No database or email provider is configured yet. Before relying on the API to receive real bookings, connect a persistence or delivery service and update the endpoint so requests are securely stored or delivered. Do not put provider credentials in frontend code.

The submitted contact details are not saved by this site. WhatsApp’s own privacy and data practices apply once the visitor opens and sends a message.

## Deploy

This project is configured for Render with the root-level `render.yaml` Blueprint.

1. Create a GitHub repository and push this project to it. Keep the repository private if you don't want the source code to be public.
2. Sign in to [Render](https://render.com), choose **New** → **Blueprint**, and connect the GitHub repository.
3. Review the service settings from `render.yaml` and deploy. Render builds with `npm install`, starts with `npm start`, and checks `/api/health`.
4. When the deploy succeeds, open the `onrender.com` URL shown on the Render service page and share that link.

The configured free web service may spin down when idle, so the first visit after a quiet period can take longer. A custom domain can be added later in the Render service settings.

## API

- `GET /api/health` — service health check.
- `POST /api/bookings` — validates route, date, time, contact details and passenger count; returns `202` and a reference on valid input. Returns `400` with field errors for invalid input.

Booking request example:

```json
{
  "from": "PLK",
  "to": "PTA",
  "date": "2030-01-20",
  "time": "09:30",
  "name": "Example Passenger",
  "phone": "079 123 4567",
  "passengers": 1,
  "pickup": "Polokwane",
  "dropoff": "Pretoria",
  "notes": ""
}
```
