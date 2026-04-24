# Haier — Pitch Deck

Investor pitch deck for **haier-hr.com**, built with [Reveal.js](https://revealjs.com/) + [Vite](https://vitejs.dev/).

> Put hiring on autopilot.

## Develop

```bash
npm install
npm run dev       # http://localhost:5173
```

Navigate slides with arrow keys · press `?` for shortcuts · `S` for speaker notes.

## Build

```bash
npm run build     # outputs static site to ./dist
npm run preview   # serves ./dist locally
```

## Deploy — GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys on every push to
`main` or the working branch. Enable Pages under **Settings → Pages → Source: GitHub Actions**.

### Base path

By default the site is served at `/<repo>/` on GitHub Pages. `vite.config.js` sets
`base: '/looop-tp/'` to match this repo. For a custom domain (apex/`haier-hr.com`)
build with:

```bash
VITE_BASE=/ npm run build
```

## Structure

```
index.html                     # deck markup — edit slides here
src/main.js                    # Reveal.js bootstrap
src/styles/theme.css           # brand theme
src/styles/reveal-overrides.css
public/favicon.svg
vite.config.js
```
