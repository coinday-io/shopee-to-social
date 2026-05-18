'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { AppSettings, ReplizAccount } from '@/lib/types';
import { platformLabel } from '@/lib/utils';

const defaultModelByProvider: Record<string, string> = {
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  claude: 'claude-haiku-4-5-20251001',
};

export function SettingsForm() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [accounts, setAccounts] = React.useState<ReplizAccount[] | null>(null);

  const [replizKey, setReplizKey] = React.useState('');
  const [openaiKey, setOpenaiKey] = React.useState('');
  const [openrouterKey, setOpenrouterKey] = React.useState('');
  const [claudeKey, setClaudeKey] = React.useState('');
  const [provider, setProvider] = React.useState<'openai' | 'openrouter' | 'claude'>('openai');
  const [model, setModel] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        const data: AppSettings = await res.json();
        setSettings(data);
        setReplizKey(data.replizApiKey ?? '');
        setOpenaiKey(data.openaiKey ?? '');
        setOpenrouterKey(data.openrouterKey ?? '');
        setClaudeKey(data.claudeKey ?? '');
        setProvider((data.defaultAiProvider as 'openai' | 'openrouter' | 'claude') ?? 'openai');
        setModel(data.defaultAiModel ?? '');
      } catch {
        toast.error('Gagal memuat settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replizApiKey: replizKey,
          openaiKey,
          openrouterKey,
          claudeKey,
          defaultAiProvider: provider,
          defaultAiModel: model || defaultModelByProvider[provider],
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Settings tersimpan');
      const fresh: AppSettings = await (await fetch('/api/settings')).json();
      setSettings(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function testRepliz() {
    setTesting(true);
    setAccounts(null);
    try {
      if (replizKey && !replizKey.includes('...')) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replizApiKey: replizKey }),
        });
      }
      const res = await fetch('/api/repliz/accounts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal');
      setAccounts(data);
      toast.success(`${data.length} akun terkoneksi`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test gagal');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-neutral-500">
        <Spinner size={24} />
      </div>
    );
  }

  const platformCounts: Record<string, number> = {};
  for (const a of accounts ?? []) {
    platformCounts[a.type] = (platformCounts[a.type] ?? 0) + 1;
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Repliz */}
      <section className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-base font-semibold mb-1">Repliz API</h2>
        <p className="text-sm text-neutral-500 mb-4">
          API key untuk posting ke media sosial via Repliz.
        </p>
        <div className="space-y-3">
          <Input
            label="API Key"
            type="text"
            value={replizKey}
            placeholder="Masukkan Repliz API key"
            onChange={(e) => setReplizKey(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={testRepliz} loading={testing}>
              Test & Load Accounts
            </Button>
            {settings?.hasReplizKey && (
              <Badge tone="success">Tersimpan</Badge>
            )}
          </div>
          {accounts && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-4">
              <div className="text-sm font-medium mb-2">
                {accounts.length} akun terkoneksi
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(platformCounts).map(([type, count]) => (
                  <Badge key={type} tone="info">
                    {platformLabel(type)}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* AI Providers */}
      <section className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-base font-semibold mb-1">AI Caption Generator</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Isi minimal satu provider, lalu pilih default-nya.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="OpenAI API Key"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
          />
          <Input
            label="OpenRouter API Key"
            value={openrouterKey}
            onChange={(e) => setOpenrouterKey(e.target.value)}
            placeholder="sk-or-..."
          />
          <Input
            label="Anthropic Claude API Key"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..."
          />
          <Select
            label="Default Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="claude">Anthropic Claude</option>
          </Select>
          <Input
            label="Default Model"
            value={model}
            placeholder={defaultModelByProvider[provider]}
            onChange={(e) => setModel(e.target.value)}
            hint={`Default: ${defaultModelByProvider[provider]}`}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={saveAll} loading={saving} size="lg">
          Simpan Semua
        </Button>
      </div>
    </div>
  );
}
