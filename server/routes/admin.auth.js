import { Hono } from 'hono'

import { adminAuth } from '../middleware/adminAuth.js'
import { login, me, logout } from '../controllers/adminAuth.controller.js'

const router = new Hono()

router.post('/login', login)
router.get('/me', adminAuth, me)
router.post('/logout', adminAuth, logout)

export default router