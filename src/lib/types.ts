export interface ShopeeProduct {
  itemid: number;
  shopid: number;
  name: string;
  description: string;
  price: number;
  price_min: number;
  price_max: number;
  images: string[];
  videos: { url: string; thumbnail: string; duration?: number }[];
  url: string;
  categories: string[];
  brand: string | null;
  shop_name: string;
  shop_location: string;
  rating: number;
  currency: string;
  scraped_at: string;
}

export interface ShopeeJsonFile {
  scraped_at: string;
  query: { type: string; keyword?: string };
  success_count: number;
  products: ShopeeProduct[];
}

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'twitter';

export interface ReplizAccount {
  id: string;
  name: string;
  username: string;
  picture: string;
  type: SocialPlatform;
  isConnected: boolean;
}

export interface PostFormData {
  product: ShopeeProduct;
  affiliateUrl: string;
  selectedImageUrl: string;
  captionHint: string;
  generatedCaption: string;
  selectedAccountIds: string[];
  scheduleAt: string;
}

export interface ReplizSchedulePayload {
  title: string;
  description: string;
  topic: string;
  type: 'image' | 'album' | 'text' | 'link';
  medias: {
    alt: string;
    type: 0 | 1; // 0 = image, 1 = video
    thumbnail: string;
    url: string;
    customThumbnail: boolean;
  }[];
  meta: { title: string; description: string; url: string };
  additionalInfo: {
    isAiGenerated: boolean;
    isDraft: boolean;
    collaborators: string[];
    music: { id: string; artist: string; name: string; thumbnail: string };
  };
  replies: [];
  accountId: string;
  scheduleAt: string;
}

export type AiProvider = 'openai' | 'openrouter' | 'claude';

export interface AppSettings {
  replizAccessKey: string | null;
  replizSecretKey: string | null;
  openaiKey: string | null;
  openrouterKey: string | null;
  claudeKey: string | null;
  defaultAiProvider: AiProvider;
  defaultAiModel: string | null;
  hasReplizKey?: boolean;
  hasOpenaiKey?: boolean;
  hasOpenrouterKey?: boolean;
  hasClaudeKey?: boolean;
}
