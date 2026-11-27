import AppLayout from '@/components/layout/AppLayout'
import OverviewPage from '@/pages/admin/OverviewPage'
import RestaurantsPage from '@/pages/admin/RestaurantsPage'
import AccountPage from '@/pages/admin/AccountPage'
import RevenuePage from '@/pages/admin/RevenuePage'
import DeletedPage from '@/pages/admin/DeletedPage'

export const ADMIN_PATHS = {
  adminOverview: '/admin',
  adminPlans: '/admin/restaurants',
  adminRevenue: '/admin/revenue',
  adminDeleted: '/admin/deleted',
  adminAccount: '/admin/account',
  login: '/admin/login',
}

export default function AdminRoutes({
  path,
  registry,
  revenue,
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
  onUpdatePayment,
  onDeletePayment,
  deleted,
  onRestore,
  onPermanentDelete,
}) {
  const page = path.startsWith(ADMIN_PATHS.adminAccount)
    ? 'adminAccount'
    : path.startsWith(ADMIN_PATHS.adminDeleted)
      ? 'adminDeleted'
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
      ) : page === 'adminDeleted' ? (
        <DeletedPage
          restaurants={deleted}
          now={now}
          onRestore={onRestore}
          onPermanentDelete={onPermanentDelete}
        />
      ) : page === 'adminRevenue' ? (
        <RevenuePage
          registry={registry}
          rows={revenue ? revenue.rows : null}
          recent={revenue ? revenue.recent : null}
          now={now}
          onAddPayment={onAddPayment}
          onUpdatePayment={onUpdatePayment}
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
          revenue={revenue}
          now={now}
          onOpenRestaurants={() => onNavigate('adminPlans')}
          onOpenRevenue={() => onNavigate('adminRevenue')}
        />
      )}
    </AppLayout>
  )
}