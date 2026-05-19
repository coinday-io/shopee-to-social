import { ShopeeJsonFile, ShopeeProduct } from './types';

/**
 * RFC 4180-ish CSV parser. Handles:
 * - Quoted fields with commas and newlines inside
 * - Escaped quotes ("" within quoted fields)
 * - UTF-8 BOM at start
 * - CRLF or LF line endings
 */
export function parseCsv(text: string): string[][] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      // Handle CRLF and bare CR
      if (text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }

  // Flush last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function splitMulti(value: string, separator: string): string[] {
  if (!value) return [];
  return value
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Convert a parsed CSV (header + rows) into a ShopeeJsonFile-like structure.
 *
 * Expected columns (from scraper output):
 * itemid, shopid, name, url, price, price_min, price_max, currency,
 * stock, sold, rating, rating_count, shop_name, shop_location, brand,
 * categories (separated by ' > '), description, image_count,
 * images (separated by ' | '), video_count, videos (separated by ' | '),
 * scraped_at, affiliate_url
 */
export function csvToShopeeJsonFile(csvText: string): ShopeeJsonFile {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new Error('CSV kosong atau hanya berisi header');
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1).filter((r) => r.length > 1 || (r[0] && r[0].trim()));

  const col = (name: string): number => header.indexOf(name);
  const idx = {
    itemid: col('itemid'),
    shopid: col('shopid'),
    name: col('name'),
    url: col('url'),
    price: col('price'),
    price_min: col('price_min'),
    price_max: col('price_max'),
    currency: col('currency'),
    rating: col('rating'),
    shop_name: col('shop_name'),
    shop_location: col('shop_location'),
    brand: col('brand'),
    categories: col('categories'),
    description: col('description'),
    images: col('images'),
    videos: col('videos'),
    scraped_at: col('scraped_at'),
    affiliate_url: col('affiliate_url'),
  };

  if (idx.itemid < 0 || idx.name < 0) {
    throw new Error(
      'CSV header tidak valid. Wajib ada kolom: itemid, name (dan lainnya seperti images, price, dst).',
    );
  }

  const get = (row: string[], i: number): string => (i >= 0 && i < row.length ? row[i] : '');

  const products: ShopeeProduct[] = dataRows.map((row) => {
    const images = splitMulti(get(row, idx.images), '|');
    const videoUrls = splitMulti(get(row, idx.videos), '|');
    const brandRaw = get(row, idx.brand).trim();
    const affiliate = get(row, idx.affiliate_url).trim();

    return {
      itemid: toNumber(get(row, idx.itemid)),
      shopid: toNumber(get(row, idx.shopid)),
      name: get(row, idx.name).trim(),
      description: get(row, idx.description),
      price: toNumber(get(row, idx.price)),
      price_min: toNumber(get(row, idx.price_min)),
      price_max: toNumber(get(row, idx.price_max)),
      images,
      videos: videoUrls.map((url) => ({ url, thumbnail: null, duration: null })),
      url: get(row, idx.url).trim(),
      categories: splitMulti(get(row, idx.categories), '>'),
      brand: brandRaw || null,
      shop_name: get(row, idx.shop_name).trim(),
      shop_location: get(row, idx.shop_location).trim(),
      rating: toNumber(get(row, idx.rating)),
      currency: get(row, idx.currency).trim() || 'IDR',
      scraped_at: get(row, idx.scraped_at).trim(),
      affiliate_url: affiliate || null,
    };
  });

  return {
    scraped_at: new Date().toISOString(),
    query: { type: 'csv-import' },
    success_count: products.length,
    products,
  };
}
