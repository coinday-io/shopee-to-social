import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(priceInCents: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(priceInCents / 100);
}

export function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function platformColor(type: string): string {
  switch (type) {
    case 'facebook':
      return 'bg-blue-600 text-white';
    case 'instagram':
      return 'bg-pink-500 text-white';
    case 'threads':
      return 'bg-black text-white';
    case 'tiktok':
      return 'bg-gray-900 text-white';
    case 'linkedin':
      return 'bg-sky-700 text-white';
    case 'youtube':
      return 'bg-red-600 text-white';
    case 'twitter':
      return 'bg-neutral-700 text-white';
    default:
      return 'bg-gray-200 text-gray-800';
  }
}

export function platformLabel(type: string): string {
  const map: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    threads: 'Threads',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    twitter: 'X / Twitter',
  };
  return map[type] ?? type;
}
