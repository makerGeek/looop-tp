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

`vite.config.js` uses `base: './'` — relative paths that work anywhere:
GitHub Pages (`/<repo>/`), Cloudflare Pages (root), custom domains, or even
`file://` previews. No extra config needed.

Override only if you need an absolute path:

```bash
VITE_BASE=/some/path/ npm run build
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
