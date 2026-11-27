import { Hono } from 'hono'

import { adminAuth } from '../middleware/adminAuth.js'
import {
  list, listDeleted, getOne, create, update, renew, subscriptions, resetDevice, resetPassword,
  remove, restore, removePermanently,
} from '../controllers/adminRestaurants.controller.js'

const router = new Hono()

router.get('/', adminAuth, list)
router.post('/', adminAuth, create)
router.get('/deleted', adminAuth, listDeleted) // must stay above '/:id'
router.get('/:id', adminAuth, getOne)
router.patch('/:id', adminAuth, update)
router.delete('/:id', adminAuth, remove) // soft delete
router.delete('/:id/permanent', adminAuth, removePermanently)
router.post('/:id/restore', adminAuth, restore)
router.post('/:id/renew', adminAuth, renew)
router.get('/:id/subscriptions', adminAuth, subscriptions)
router.post('/:id/reset-device', adminAuth, resetDevice)
router.post('/:id/reset-password', adminAuth, resetPassword)

export default router