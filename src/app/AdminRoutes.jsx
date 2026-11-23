import AppLayout from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/admin/OverviewPage'
import RestaurantsPage from '@/pages/admin/RestaurantsPage'
import AccountPage from '@/pages/admin/AccountPage'
import RevenuePage from '@/pages/admin/RevenuePage'

export const ADMIN_PATHS = {
  adminOverview: '/admin',
  adminPlans: '/admin/restaurants',
  adminRevenue: '/admin/revenue',
  adminAccount: '/admin/account',
  login: '/admin/login',
}

export default function AdminRoutes({
  path,
  registry,
  payments,
  now,
  onNavigate,
  onLogout,
  onCreate,
  onUpdate,
  onRenew,
  onResetPassword,
  onResetDevice,
  onDelete,
  onAddPayment,
  onDeletePayment,
}) {
  const page = path.startsWith(ADMIN_PATHS.adminAccount)
    ? 'adminAccount'
    : path.startsWith(ADMIN_PATHS.adminRevenue)
      ? 'adminRevenue'
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
      ) : page === 'adminRevenue' ? (
        <RevenuePage
          registry={registry}
          payments={payments}
          now={now}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
        />
      ) : page === 'adminPlans' ? (
        <RestaurantsPage
          registry={registry}
          now={now}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onRenew={onRenew}
          onResetPassword={onResetPassword}
          onResetDevice={onResetDevice}
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