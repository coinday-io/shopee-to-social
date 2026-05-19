'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Combobox, ComboboxOption } from '@/components/ui/Combobox';
import { AppSettings, ReplizAccount } from '@/lib/types';
import { platformLabel } from '@/lib/utils';
import { fetchJson } from '@/lib/fetch-client';

interface AiModel {
  id: string;
  name: string;
  description?: string;
}

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

  const [replizAccessKey, setReplizAccessKey] = React.useState('');
  const [replizSecretKey, setReplizSecretKey] = React.useState('');
  const [openaiKey, setOpenaiKey] = React.useState('');
  const [openrouterKey, setOpenrouterKey] = React.useState('');
  const [claudeKey, setClaudeKey] = React.useState('');
  const [provider, setProvider] = React.useState<'openai' | 'openrouter' | 'claude'>('openai');
  const [model, setModel] = React.useState('');
  const [models, setModels] = React.useState<AiModel[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson<AppSettings>('/api/settings');
        setSettings(data);
        setReplizAccessKey(data.replizAccessKey ?? '');
        setReplizSecretKey(data.replizSecretKey ?? '');
        setOpenaiKey(data.openaiKey ?? '');
        setOpenrouterKey(data.openrouterKey ?? '');
        setClaudeKey(data.claudeKey ?? '');
        setProvider((data.defaultAiProvider as 'openai' | 'openrouter' | 'claude') ?? 'openai');
        setModel(data.defaultAiModel ?? '');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal memuat settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadModels = React.useCallback(async (forProvider: typeof provider) => {
    setModelsLoading(true);
    setModelsError(null);
    setModels([]);
    try {
      const data = await fetchJson<{ models: AiModel[] }>(
        `/api/ai/models?provider=${forProvider}`,
      );
      setModels(data.models);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal load models';
      setModelsError(msg);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  // Reload model list when provider changes (after initial load)
  React.useEffect(() => {
    if (loading) return;
    void loadModels(provider);
  }, [provider, loading, loadModels]);

  async function saveAll() {
    setSaving(true);
    try {
      await fetchJson('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replizAccessKey,
          replizSecretKey,
          openaiKey,
          openrouterKey,
          claudeKey,
          defaultAiProvider: provider,
          defaultAiModel: model || defaultModelByProvider[provider],
        }),
      });
      toast.success('Settings tersimpan');
      const fresh = await fetchJson<AppSettings>('/api/settings');
      setSettings(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function testRepliz() {
    if (!replizAccessKey || !replizSecretKey) {
      return toast.error('Isi Access Key dan Secret Key dulu');
    }
    setTesting(true);
    setAccounts(null);
    try {
      await fetchJson('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replizAccessKey, replizSecretKey }),
      });
      const data = await fetchJson<ReplizAccount[]>('/api/repliz/accounts');
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
          Auth pakai HTTP Basic. Dapatkan Access Key + Secret Key dari{' '}
          <a
            href="https://app.repliz.com/developer"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Repliz developer settings
          </a>
          .
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Access Key"
            type="text"
            value={replizAccessKey}
            placeholder="0160995268"
            onChange={(e) => setReplizAccessKey(e.target.value)}
          />
          <Input
            label="Secret Key"
            type="password"
            value={replizSecretKey}
            placeholder="cvIKL4uxjSlrmbtOT9OjeST2AXcVI1N7"
            onChange={(e) => setReplizSecretKey(e.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" onClick={testRepliz} loading={testing}>
            Test & Load Accounts
          </Button>
          {settings?.hasReplizKey && <Badge tone="success">Tersimpan</Badge>}
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
          <div className="md:col-span-2">
            <Combobox
              label={`Default Model (${models.length > 0 ? `${models.length} tersedia` : 'load list...'})`}
              value={model}
              onChange={setModel}
              options={
                models.map((m) => ({
                  value: m.id,
                  label: m.name,
                  description: m.description,
                })) as ComboboxOption[]
              }
              loading={modelsLoading}
              placeholder={defaultModelByProvider[provider]}
              hint={
                modelsError
                  ? `${modelsError} (kamu masih bisa ketik ID model manual)`
                  : `Default jika kosong: ${defaultModelByProvider[provider]}. Bisa ketik untuk filter.`
              }
              emptyHint={
                modelsError
                  ? 'Belum bisa load list. Simpan API key dulu lalu refresh halaman.'
                  : 'Tidak ada model cocok'
              }
            />
            <button
              type="button"
              onClick={() => void loadModels(provider)}
              disabled={modelsLoading}
              className="mt-1 text-xs font-medium text-primary hover:underline disabled:text-neutral-400"
            >
              ↻ Refresh list
            </button>
          </div>
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
