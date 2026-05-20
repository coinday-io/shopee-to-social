import { Header } from '@/components/layout/Header';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  return (
    <div>
      <Header
        title="Jadwal"
        subtitle="Calendar view dari semua jadwal posting di Repliz"
      />
      <div className="p-6">
        <ScheduleCalendar />
      </div>
    </div>
  );
}
