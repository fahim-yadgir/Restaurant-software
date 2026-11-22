
import AppLayout from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/admin/OverviewPage'
import RestaurantsPage from '@/pages/admin/RestaurantsPage'
import AccountPage from '@/pages/admin/AccountPage'

export const ADMIN_PATHS = {
  adminOverview: '/admin',
  adminPlans: '/admin/restaurants',
  adminAccount: '/admin/account',
  login: '/admin/login',
}

export default function AdminRoutes({
  path,
  registry,
  now,
  onNavigate,
  onLogout,
  onCreate,
  onUpdate,
  onRenew,
  onResetPassword,
  onDelete,
}) {
  const page = path.startsWith(ADMIN_PATHS.adminAccount)
    ? 'adminAccount'
    : path.startsWith(ADMIN_PATHS.adminPlans)
      ? 'adminPlans'
      : 'admin'

  return (
    <AppLayout
      page={page}
      setPage={onNavigate}
      role="admin"
      onLogout={onLogout}
    >
      {page === 'adminAccount' ? (
        <AccountPage onLogout={onLogout} />
      ) : page === 'adminPlans' ? (
        <RestaurantsPage
          registry={registry}
          now={now}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onRenew={onRenew}
          onResetPassword={onResetPassword}
          onDelete={onDelete}
        />
      ) : (
        <OverviewPage
          registry={registry}
          now={now}
          onOpenRestaurants={() => onNavigate('adminPlans')}
        />
      )}
    </AppLayout>
  )
}
