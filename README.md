# Pacer TMS

A transportation management system (TMS) for a company's internal shipments, with a dashboard-style web app for the people who plan, move, and bill freight.

Pacer TMS started as my bootcamp project. I'm rebuilding it as an AI-assisted development case study: planning, test-driven development, and code review with Claude Code, documented as I go. It's a demo and portfolio project, not a commercial product. It uses free APIs where they exist and seeded data where they don't.

## Status

Early development. The scope and architecture are planned and the backend and frontend are scaffolded. The features below are the MVP scope, not yet built.

## MVP scope

The app is for a single example company, Larkspur Freight, and its staff. There's no public sign-up; users log in with their company email.

**Roles:** operations management, warehouse management, warehouse, dispatcher, customer service, accounting operations, accounting management.

**Pages**
- **Orders and clients:** order overview, adding orders, and client records with shipping addresses.
- **Shipments:** status, mode, carrier, and current location, with route planning, carrier bidding, and the ability to override each choice.
- **Warehouse:** item stock and locations, shipment label scanning, and flagged shipments.
- **Documents:** bills of lading, shipping labels, and other operational documents, with configurable retention periods.
- **Financials:** incoming carrier invoices and outgoing client invoices, with status tracking and CSV export.
- **Carriers:** carriers used, the modes and routes they cover, and preferred-carrier marking.
- **Analytics:** on-time delivery rate, cost per unit, carrier performance, freight spend, and more.
- **Team and schedules:** reportees, shift status, and weekly worker schedules.
- **Configuration and settings:** warehouse locations, hours, document retention, invoice deadlines, and password updates.

## Tech stack

- **Frontend:** React and Vite (login-gated, so no Next.js)
- **Backend:** NestJS, with sessions via Passport (local strategy)
- **Database:** Postgres
- **Integrations:** OpenRouteService (directions, geocoding), Open-Meteo (weather), FMCSA, Shippo (rates and tracking)
- **Tooling:** pnpm, Vitest, oxlint, Prettier, Docker and a dev container
- **Hosting (planned):** AWS, with the frontend as static hosting on S3

## Configuration

- `API_KEY` (required, in the root `.env`): every backend route requires it in an `x-api-key` header, and the backend won't start without it. The frontend's dev server adds it to `/api` requests, so it never reaches the browser.

## How it's built

- Every change starts with a plan and a testing plan, and tests are written and approved before implementation.
- Claude Code runs inside a dev container with the sandbox enabled, so what it can access is explicit and reviewable.
- Project instructions for the AI live in [`CLAUDE.md`](./CLAUDE.md).
- The UI layout, styling and responsiveness rules are in the [frontend README](./frontend/README.md).
