# CampusBites client

This directory contains the React/Vite frontend. See the [root README](../README.md) for product documentation, setup, environment variable names, API reference, testing, and deployment notes.

## Local commands

Run from the repository root:

```bash
npm --prefix client run dev
npm --prefix client run lint
npm --prefix client run build
```

For local API configuration, copy `client/.env.example` to `client/.env` and set `VITE_API_URL` to your local server's `/api` base URL. Never commit `.env` files.
