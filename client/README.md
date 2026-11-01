# CampusBites client

This directory contains the React/Vite frontend. See the [root README](../README.md) for product documentation, setup, environment variable names, API reference, testing, and deployment notes.

The production build registers a service worker that caches static assets and an offline page only. It never caches API/socket responses or queues orders; verify install and offline behavior on real target devices before relying on it.

## Local commands

Run from the repository root:

```bash
npm --prefix client run dev
npm --prefix client run lint
npm --prefix client run build
npm --prefix client test
```

Client unit tests use Node's built-in `node:test` runner; add `*.test.js` files under `client/test/`.

For local API configuration, copy `client/.env.example` to `client/.env` and set `VITE_API_URL` to your local server's `/api` base URL. Never commit `.env` files.
