import { Header } from '@/components/layout/Header';
import { SettingsForm } from '@/components/settings/SettingsForm';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div>
      <Header title="Settings" subtitle="Kelola API key dan provider AI" />
      <div className="p-6">
        <SettingsForm />
      </div>
    </div>
  );
}
