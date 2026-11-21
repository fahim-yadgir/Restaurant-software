import AppLayout from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/admin/OverviewPage'
import RestaurantsPage from '@/pages/admin/RestaurantsPage'

// Platform admin area: /admin (overview) and /admin/restaurants (register & manage restaurants).
export const ADMIN_PATHS = { adminOverview: '/admin', adminPlans: '/admin/restaurants', login: '/admin/login' }

export default function AdminRoutes({ path, registry, now, onNavigate, onLogout, onCreate, onRenew, onResetPassword, onDelete }) {
  const page = path.startsWith(ADMIN_PATHS.adminPlans) ? 'adminPlans' : 'admin'
  return <AppLayout page={page} setPage={onNavigate} role="admin" onLogout={onLogout}>
    {page === 'adminPlans'
      ? <RestaurantsPage registry={registry} now={now} onCreate={onCreate} onRenew={onRenew} onResetPassword={onResetPassword} onDelete={onDelete} />
      : <OverviewPage registry={registry} now={now} onOpenRestaurants={() => onNavigate('adminPlans')} />}
  </AppLayout>
}
