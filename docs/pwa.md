# PWA

The app is installable on phones and tablets through the browser's standard
install flow.

For GitHub Pages the production build uses the `/GryLogiczne/` base path.
The repository also keeps a static fallback for the current `main/root` Pages
setting: the root `index.html` redirects GitHub Pages visitors to `/dist/`,
while Vite development on localhost still loads `src/main.tsx` directly.

## Implemented

- Web app manifest: `public/manifest.webmanifest`
- Standalone display mode
- Theme and background colors
- Android-compatible PNG icons: 192 x 192 and 512 x 512
- Maskable 512 x 512 icon
- Apple touch icon metadata
- Service worker registration
- Offline shell caching for the built app
- Safe-area-aware responsive layout
- GitHub Pages deployment through GitHub Actions

## Service Worker Strategy

`public/sw.js` caches the app shell during installation and then caches same
origin GET requests as they are loaded. Navigation requests fall back to
`index.html` when offline.

The cache version is stored in `CACHE_VERSION`. Bump it when the cached shell
changes in a way that should force old assets out.
