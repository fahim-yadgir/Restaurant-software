import { Hono } from 'hono'

import { ApiError } from './utils/errors.js'
import adminAuthRoutes from './routes/admin.auth.js'
import adminRestaurantRoutes from './routes/admin.restaurants.js'

const app = new Hono()

// Secrets every API route needs. They come from .dev.vars (local) or
// `wrangler secret put` (production).
const REQUIRED_SECRETS = ['ADMIN_PASSWORD', 'JWT_SECRET', 'LICENSE_PRIVATE_KEY']

// Quick check that the API, database and secrets are ready:  /api/health
// (Only true/false is shown for secrets, never their values.)
app.get('/api/health', async (c) => {
  let db = false
  let restaurants = null

  try {
    const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM restaurants').first()

    db = true
    restaurants = row.n
  } catch (error) {
    console.error('Database check failed:', error.message)
  }

  const secrets = Object.fromEntries(REQUIRED_SECRETS.map((name) => [name, !!c.env[name]]))

  return c.json({
    ok: true,
    service: 'restrodesk-api',
    db,
    restaurants,
    secrets,
    time: Date.now(),
  })
})

// Stop early with a clear message if a secret was forgotten.
app.use('/api/*', async (c, next) => {
  const missing = REQUIRED_SECRETS.filter((name) => !c.env[name])

  if (missing.length) {
    console.error(`Missing secrets: ${missing.join(', ')}`)

    throw new ApiError(
      500,
      'SERVER_NOT_CONFIGURED',
      `Server is missing: ${missing.join(', ')}. Run "npm run keys" and create .dev.vars.`
    )
  }

  await next()
})

// ---------- Routes ----------
app.route('/api/admin', adminAuthRoutes) // POST /login, GET /me
app.route('/api/admin/restaurants', adminRestaurantRoutes) // restaurants CRUD, renew, history

// Any other /api/... URL
app.notFound((c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }, 404)
)

// Known errors (ApiError) keep their message. Unexpected ones are logged and hidden.
app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: { code: error.code, message: error.message } }, error.status)
  }

  console.error(error)

  return c.json(
    { error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } },
    500
  )
})

export default app