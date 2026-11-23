import { useState } from 'react'
import { LogOut, KeyRound } from 'lucide-react'

import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import { formatDate } from '@/lib/registry'
import { requireOnline } from '@/lib/requireOnline'

export default function SettingsPage({
  license,
  licenseStatus,
  profile,
  onSaveProfile,
  onLogout,
  onChangePassword,
}) {
  const [gstin, setGstin] = useState(profile?.gstin || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [pwOpen, setPwOpen] = useState(false)

  const saveSettings = () => {
    try {
      requireOnline()

      onSaveProfile({
        gstin: gstin.trim(),
        address: address.trim(),
      })

      window.alert('Restaurant settings updated successfully!')
    } catch (error) {
      window.alert(error.message)
    }
  }

  const rows = [
    ['Restaurant', license.restaurantName],
    ['Owner', license.ownerName],
    ['Mobile', license.ownerMobile],
    ['Email', license.ownerEmail],
    ['First login on', formatDate(license.activatedAt)],
    ['Linked device', license.deviceId],
    ['Plan', license.planType === 'lifetime' ? 'Lifetime' : `${license.durationDays} days`],
    ['Expires on', license.planType === 'lifetime' ? 'Never' : formatDate(license.expiresAt)],
    ['Time remaining', licenseStatus.lifetime ? 'Unlimited' : `${licenseStatus.days} days`],
  ]

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold">
          Restaurant Settings
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Only GSTIN, restaurant address and password can be changed here.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <b>Subscription</b>
          <Badge tone="green">
            Active · {license.planType === 'lifetime' ? 'Lifetime plan' : `${license.durationDays}-day plan`}
          </Badge>
        </div>

        <dl className="grid gap-2.5 text-sm">
          {rows.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <dt className="text-slate-500">{key}</dt>
              <dd className="break-all text-right font-semibold">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <b>Restaurant information</b>

        <Field
          label="GSTIN"
          value={gstin}
          onChange={setGstin}
          placeholder="Enter GSTIN"
        />

        <Field
          label="Restaurant address"
          value={address}
          onChange={setAddress}
          placeholder="Enter complete restaurant address"
        />

        <Button onClick={saveSettings}>
          Save settings
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <b>Account & security</b>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as {license.ownerName} ({license.ownerEmail}).
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              try {
                requireOnline()
                setPwOpen(true)
              } catch (error) {
                window.alert(error.message)
              }
            }}
          >
            <KeyRound size={15} /> Change password
          </Button>

          <Button variant="secondary" onClick={onLogout}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>
      </div>

      {pwOpen && (
        <Modal
          title="Change password"
          subtitle={license.restaurantName}
          size="sm"
          onClose={() => setPwOpen(false)}
        >
          <ChangePasswordForm
            onSubmit={async (...args) => {
              try {
                requireOnline()
                const result = await onChangePassword(...args)
                if (!result) {
                  window.alert('Password changed successfully!')
                }
                return result
              } catch (error) {
                return error.message
              }
            }}
            onDone={() => setPwOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}