export interface ShopeeProduct {
  itemid: number;
  shopid: number;
  name: string;
  description: string;
  price: number;
  price_min: number;
  price_max: number;
  images: string[];
  videos: { url: string; thumbnail: string | null; duration?: number | null }[];
  url: string;
  categories: string[];
  brand: string | null;
  shop_name: string;
  shop_location: string;
  rating: number;
  currency: string;
  scraped_at: string;
  affiliate_url?: string | null;
}

export interface ShopeeJsonFile {
  scraped_at: string;
  query?: { type?: string; keyword?: string; items?: unknown[] };
  success_count?: number;
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

export type PostMode = 'image' | 'album' | 'video' | 'reel' | 'story' | 'text' | 'link';

export interface ReplizMedia {
  alt: string;
  // Repliz spec is ambiguous: schema says number enum [0,1] but example
  // and GET response use string "image" / "video". Strings work for both
  // image and video so we standardise on strings.
  type: 'image' | 'video';
  thumbnail: string;
  url: string;
  customThumbnail: boolean;
}

export interface ReplizSchedulePayload {
  title: string;
  description: string;
  topic: string;
  type: PostMode;
  medias: ReplizMedia[];
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

export type ReplizScheduleStatus = 'pending' | 'process' | 'success' | 'error';

export interface ReplizScheduleItem {
  _id: string;
  title: string;
  description: string;
  topic: string;
  type: string; // image | album | video | reel | story | text | link
  medias: { alt?: string; type?: string | number; thumbnail?: string; url?: string }[];
  meta: { title?: string; description?: string; url?: string };
  status: ReplizScheduleStatus;
  scheduleAt: string;
  accountId: string;
  account?: {
    _id: string;
    name: string;
    username: string;
    picture: string;
    type: SocialPlatform;
  };
  createdAt?: string;
  updatedAt?: string;
}

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
