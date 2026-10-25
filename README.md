# Orbyte Cloud — Local Edition

This is a standalone local copy of the Orbyte Cloud website. It does not use ChatGPT authentication, ChatGPT Sites, Cloudflare Workers, Cloudflare D1, or any hosted database.

## Requirements

- Node.js 22.13 or newer
- npm

## Start locally

    npm install
    npm run dev

Then open:

- Website: http://127.0.0.1:3000
- User details dashboard: http://127.0.0.1:3000/admin

## Where user information is stored

All form submissions are stored in this normal SQLite file:

    data/orbyte.db

The complete absolute location on this Mac is:

    /Users/krishnasen/Documents/Codex/2026-10-25/https-www-kubenine-com-https-www/outputs/orbyte-cloud-local/data/orbyte.db

The database file is created automatically after the first server start or form submission.

You can view the records in three ways:

1. Open http://127.0.0.1:3000/admin while the website is running.
2. Run npm run db:show in Terminal.
3. Open data/orbyte.db using a SQLite desktop application.

## Production build

    npm run build
    npm start

The server intentionally binds to 127.0.0.1, so it is only reachable from this Mac by default.

## Optional database location

Set ORBYTE_DATA_DIR before starting the server to place the database in another folder.
