import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import loginHandler from './api/login.js';
import forgotPasswordHandler from './api/forgot-password.js';
import resetHandler from './api/reset-password.js';
import verifyHandler from './api/verify-email.js';
import sendVerificationHandler from './api/send-verification.js';

function gymPulseApiPlugin() {
  const handlerMap = {
    '/api/login': loginHandler,
    '/api/forgot-password': forgotPasswordHandler,
    '/api/reset-password': resetHandler,
    '/api/verify-email': verifyHandler,
    '/api/send-verification': sendVerificationHandler,
  };

  const middleware = (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const handler = handlerMap[pathname];

    if (!handler) {
      return next();
    }

    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch {
        req.body = {};
      }
      req.query = Object.fromEntries(url.searchParams.entries());

      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };
      res.redirect = (redirectUrl) => {
        res.statusCode = 302;
        res.setHeader('Location', redirectUrl);
        res.end();
        return res;
      };

      try {
        await handler(req, res);
      } catch (err) {
        console.error('API Endpoint Error:', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      }
    });
  };

  return {
    name: 'gympulse-api-endpoints',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), gymPulseApiPlugin()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-qr': ['qrcode.react', 'html5-qrcode']
        }
      }
    }
  }
});
