import { PostMode, ReplizAccount, ReplizMedia, ReplizSchedulePayload } from './types';

export class ReplizClient {
  private baseUrl = 'https://api.repliz.com';
  private authHeader: string;

  constructor(accessKey: string, secretKey: string) {
    const token = Buffer.from(`${accessKey}:${secretKey}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: this.authHeader,
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

// Repliz ScheduleMedia.type enum: 0 = image, 1 = video
export const ReplizMediaType = { Image: 0, Video: 1 } as const;

export interface BuildPayloadInput {
  product: { name: string; description: string; url: string };
  affiliateUrl: string;
  caption: string;
  mode: PostMode;
  /** URLs of selected images (for image, album, story) */
  imageUrls?: string[];
  /** URL of selected video (for video, reel) */
  videoUrl?: string;
  /** Optional video thumbnail (poster) */
  videoThumbnail?: string;
  accountId: string;
  scheduleAt: string;
}

export function buildReplizPayload(input: BuildPayloadInput): ReplizSchedulePayload {
  const {
    product,
    affiliateUrl,
    caption,
    mode,
    imageUrls = [],
    videoUrl,
    videoThumbnail,
    accountId,
    scheduleAt,
  } = input;

  let medias: ReplizMedia[] = [];

  if (mode === 'image' || mode === 'story') {
    const url = imageUrls[0];
    if (url) {
      medias = [
        {
          alt: product.name,
          type: ReplizMediaType.Image,
          thumbnail: url,
          url,
          customThumbnail: false,
        },
      ];
    }
  } else if (mode === 'album') {
    medias = imageUrls.map((url) => ({
      alt: product.name,
      type: ReplizMediaType.Image,
      thumbnail: url,
      url,
      customThumbnail: false,
    }));
  } else if (mode === 'video' || mode === 'reel') {
    if (videoUrl) {
      const thumb = videoThumbnail || imageUrls[0] || '';
      medias = [
        {
          alt: product.name,
          type: ReplizMediaType.Video,
          thumbnail: thumb,
          url: videoUrl,
          customThumbnail: !!videoThumbnail,
        },
      ];
    }
  }
  // text and link → medias stays empty array

  return {
    // title & topic are required by Repliz but show up prominently on
    // some platforms (FB/Threads prepend title to post body). Keep them
    // empty so the caption is the only visible text.
    title: '',
    description: caption,
    topic: '',
    type: mode,
    medias,
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
