import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// In `npm run dev`, serve the same /api/imagine and /api/stranger handlers Vercel runs in production.
// Server-only keys are read from .env here and never reach the browser bundle (only VITE_* vars do).
function api(mode: string): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[k] ??= v
      for (const name of ['imagine', 'stranger'] as const)
        server.middlewares.use(`/api/${name}`, async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
        const { POST } = (await server.ssrLoadModule(`/api/${name}.ts`)) as typeof import('./api/imagine.ts')
        const out = await POST(new Request(`http://${req.headers.host}/api/${name}`, { method: 'POST', headers, body: Buffer.concat(chunks) }))
        res.statusCode = out.status
        out.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await out.arrayBuffer()))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), api(mode)],
}))
