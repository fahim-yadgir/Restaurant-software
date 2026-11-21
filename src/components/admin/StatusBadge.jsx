import Badge from '@/components/ui/Badge'

export const STATUS = { pending: ['orange', 'Awaiting activation'], active: ['green', 'Active'], expiring: ['orange', 'Expiring soon'], expired: ['red', 'Expired'] }

export default function StatusBadge({ status }) {
  const [tone, label] = STATUS[status]
  return <Badge tone={tone}>{label}</Badge>
}
