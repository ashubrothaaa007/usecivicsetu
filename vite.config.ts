import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { runGeminiAnalysis } from './api/analyze-garbage'

function geminiDevPlugin() {
  return {
    name: 'gemini-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/analyze-garbage' && req.method === 'POST') {
          let rawBody = '';
          req.on('data', (chunk: any) => {
            rawBody += chunk;
          });
          req.on('end', async () => {
            try {
              const { image, mimeType } = JSON.parse(rawBody || '{}');
              const result = await runGeminiAnalysis(image, mimeType);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, data: result }));
            } catch (err: any) {
              console.error('Gemini dev server error:', err);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Analysis error' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.GEMINI_API_KEY && env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [
      geminiDevPlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('leaflet')) {
                return 'vendor-leaflet';
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
                return 'vendor-ui';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
            }
          },
        },
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
})
