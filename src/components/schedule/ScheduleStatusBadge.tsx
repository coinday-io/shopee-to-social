import { Badge } from '@/components/ui/Badge';

export function ScheduleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge tone="success">Berhasil</Badge>;
    case 'error':
      return <Badge tone="danger">Gagal</Badge>;
    case 'pending':
    default:
      return <Badge tone="warning">Pending</Badge>;
  }
}
