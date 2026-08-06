# Branding assets

Drop official **logo** and **favicon** files in this directory. The application reads copies (or equivalents) from `frontend/public/branding/` so the Vite dev server and production build can serve them as static files.

## Expected files

| File | Purpose | Suggested formats |
|------|---------|-------------------|
| `logo.svg` / `logo.png` | Full wordmark or lockup for README, docs, and future in-app header use | SVG preferred; PNG @2x also fine |
| `favicon.svg` / `favicon.ico` | Browser tab icon | SVG preferred; `.ico` optional for older browsers |

## How to update branding

1. Replace `branding/logo.svg` and/or `branding/favicon.svg` with your artwork.
2. Copy the same files into `frontend/public/branding/` so the running app picks them up:

```bash
cp branding/logo.svg branding/favicon.svg frontend/public/branding/
```

3. If you add `favicon.ico`, also place it at `frontend/public/favicon.ico` (or under `frontend/public/branding/`) and update `frontend/index.html` accordingly.

The current SVG placeholders use the product teal palette (`#0f6a5a` / `#0a463c`) so they match the UI until custom art is ready.
