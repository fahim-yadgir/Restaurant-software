import { Hono } from 'hono'

import { adminAuth } from '../middleware/adminAuth.js'
import {
  createPayment, recentPayments, removePayment, revenue, updatePayment,
} from '../controllers/adminRevenue.controller.js'

const router = new Hono()

router.get('/revenue', adminAuth, revenue)
router.get('/payments/recent', adminAuth, recentPayments)
router.post('/payments', adminAuth, createPayment)
router.patch('/payments/:id', adminAuth, updatePayment)
router.delete('/payments/:id', adminAuth, removePayment)

export default router