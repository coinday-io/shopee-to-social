import { Header } from '@/components/layout/Header';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  return (
    <div>
      <Header
        title="Jadwal"
        subtitle="Riwayat dan status posting yang sudah dijadwalkan"
      />
      <div className="p-6">
        <ScheduleTable />
      </div>
    </div>
  );
}
