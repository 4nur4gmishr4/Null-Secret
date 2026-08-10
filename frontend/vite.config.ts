// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

/**
 * Emits a Vercel `_headers` file with a strict Content-Security-Policy whose
 * connect-src is derived from the SAME VITE_API_BASE the app reads at runtime
 * (src/utils/api.ts). This pins the API origin instead of a blanket `https:`
 * scheme-source, and mirrors the backend's own dynamic CSP in
 * internal/api/handlers.go so the two cannot drift.
 */
function cspHeaders(): Plugin {
  let outDir = 'dist';
  let apiOrigin = 'http://localhost:8080';

  return {
    name: 'nullsecret-csp-headers',
    apply: 'build',
    config(_config, { mode }) {
      const apiBase = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE || '';
      if (apiBase) {
        try {
          apiOrigin = new URL(apiBase).origin;
        } catch {
          apiOrigin = 'http://localhost:8080';
        }
      }
    },
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const csp = [
        "default-src 'self'",
        "script-src 'self' https://va.vercel-scripts.com",
        "worker-src 'self' blob:",
        `connect-src 'self' ${apiOrigin} https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
        "img-src 'self' data: blob: https://*.googleusercontent.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ].join('; ');
      writeFileSync(
        resolve(outDir, '_headers'),
        [
          '/*',
          `  Content-Security-Policy: ${csp}`,
          '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          '',
        ].join('\n'),
      );
      console.log(`[nullsecret] Wrote CSP _headers with connect-src: 'self' ${apiOrigin} ...`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Null-Secret',
        short_name: 'Null-Secret',
        description: 'Zero-Knowledge Ephemeral Secret Sharing',
        theme_color: '#000000',
        icons: [
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    cspHeaders()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) {
            return 'firebase';
          }
          if (id.includes('lottie')) {
            return 'lottie';
          }
          return 'vendor';
        }
      }
    }
  }
})