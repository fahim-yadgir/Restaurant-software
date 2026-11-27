import { Hono } from 'hono'

import { changePassword, login, refresh } from '../controllers/ownerAuth.controller.js'

const router = new Hono()

router.post('/auth/owner/login', login)
router.post('/license/refresh', refresh)
router.post('/owner/change-password', changePassword)

export default router