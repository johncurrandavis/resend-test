
// when the frontend makes a request to: http://localhost:5173/.netlify/functions/hello
// Vite intercepts it and forwards it to: http://localhost:9999/.netlify/functions/hello
// the browser thinks it's talking to its own server, so we avoid the cross-origin request issue
// this is a development-only arrangement, when we eventually deploy to Netlify,
// the real Netlify site will handle the function URL directly

import { defineConfig } from 'vite';


export default defineConfig({

  server: {

    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true
      }
    }

  }

});
