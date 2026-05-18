import { ReplizAccount, ReplizSchedulePayload } from './types';

export class ReplizClient {
  private baseUrl = 'https://api.repliz.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  async getAccounts(page = 1, limit = 50): Promise<{ docs: ReplizAccount[]; total: number }> {
    const res = await fetch(
      `${this.baseUrl}/public/account?page=${page}&limit=${limit}`,
      { headers: this.headers, cache: 'no-store' },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Repliz getAccounts ${res.status}: ${text || res.statusText}`);
    }
    const data = await res.json();
    return { docs: data.docs ?? [], total: data.totalDocs ?? data.docs?.length ?? 0 };
  }

  async createSchedule(payload: ReplizSchedulePayload): Promise<{ scheduleId: string }> {
    const res = await fetch(`${this.baseUrl}/public/schedule`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Repliz createSchedule error: ${res.status}`);
    }
    const data = await res.json();
    return { scheduleId: data.scheduleId ?? data.id ?? data._id ?? '' };
  }

  async getSchedules(page = 1, limit = 20) {
    const res = await fetch(
      `${this.baseUrl}/public/schedule?page=${page}&limit=${limit}`,
      { headers: this.headers, cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`Repliz getSchedules error: ${res.status}`);
    return res.json();
  }
}

export function buildReplizPayload(
  product: { name: string; description: string; url: string },
  affiliateUrl: string,
  imageUrl: string,
  caption: string,
  accountId: string,
  scheduleAt: string,
): ReplizSchedulePayload {
  return {
    title: product.name.substring(0, 100),
    description: caption,
    topic: 'Shopee Product',
    type: 'image',
    medias: [
      {
        alt: product.name,
        type: 'image',
        thumbnail: imageUrl,
        url: imageUrl,
        customThumbnail: false,
      },
    ],
    meta: {
      title: product.name,
      description: (product.description ?? '').substring(0, 200),
      url: affiliateUrl || product.url,
    },
    additionalInfo: {
      isAiGenerated: true,
      isDraft: false,
      collaborators: [],
      music: { id: '', artist: '', name: '', thumbnail: '' },
    },
    replies: [],
    accountId,
    scheduleAt,
  };
}
