# AccessiCheck

A web accessibility auditing tool. Paste a URL, scan it against WCAG rules with axe-core, get a 0–100 score, and see every issue with a plain-language fix.

- **Live app:** https://gul-e-narjis.github.io/AccessiCheck/
- **API:** https://accessicheck-backend.vercel.app

## Project structure

```
AccessiCheck/
├── index.html, *.html     Frontend pages (served by GitHub Pages)
├── css/, js/, images/     Frontend styles, scripts and assets
└── backend/               Node.js + Express + MongoDB API (deployed on Vercel)
```

## Features

- WCAG scans with axe-core, grouped into high, moderate and minor issues
- PDF audit report, fix simulator and "go to element" highlighting
- Accessibility debt tracker across repeat scans
- Accounts with JWT login and saved scan history

## Run the backend locally

```bash
cd backend
npm install
cp .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
node server.js         # http://localhost:5000
```

`GET /api/ping` checks the database connection and is used to keep the free MongoDB cluster active.

## Tech

HTML, CSS, JavaScript, axe-core, Node.js, Express, MongoDB (Mongoose), JWT, bcrypt, Figma
