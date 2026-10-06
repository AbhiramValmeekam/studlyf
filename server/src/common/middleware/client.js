import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Serves the built frontend from this same process, so the SPA, the API and /media share one
 * origin. That single origin is what makes authentication work without CORS rules, a COOKIE_DOMAIN
 * or a build-time API URL: the app calls /api/v1 on the very origin it was served from, so the
 * session cookie is first-party and SameSite=Lax is sufficient.
 *
 * No-ops when there is no build to serve, which keeps `npm run dev` (Vite on its own port,
 * proxying here) and the API test suite exactly as they were.
 */
export function serveClient(config) {
  const index = path.join(config.clientDir, 'index.html');
  if (!existsSync(index)) return (_req, _res, next) => next();

  const assets = express.static(config.clientDir, {
    index: false,
    setHeaders: (res, filePath) => {
      // Vite writes content-hashed names under assets/, so a changed file is a changed URL and
      // those can be cached forever. Everything else — index.html, the theme bootstrap, the
      // files copied verbatim out of public/ — keeps its name across a deploy, so it must
      // revalidate or a deploy would never reach anyone.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    },
  });

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    assets(req, res, (err) => {
      if (err) return next(err);
      // Not a file. Never answer an API or media path with the HTML shell: a caller asking for
      // /api/v1/typo must get JSON, not a 200 page it cannot parse.
      if (req.path.startsWith('/api/') || req.path.startsWith('/media/')) return next();
      // Everything else is a client-side route, so hand back the shell and let React Router
      // resolve it. Never cached: the shell names the hashed bundle, so a stale copy pins the
      // visitor to the previous deploy.
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(index, (sendErr) => (sendErr ? next(sendErr) : undefined));
    });
  };
}
