import { Hono } from 'hono'

import { adminAuth } from '../middleware/adminAuth.js'
import { changePassword, login, me, logout } from '../controllers/adminAuth.controller.js'

const router = new Hono()

router.post('/login', login)
router.get('/me', adminAuth, me)
router.post('/change-password', adminAuth, changePassword)
router.post('/logout', adminAuth, logout)

export default router