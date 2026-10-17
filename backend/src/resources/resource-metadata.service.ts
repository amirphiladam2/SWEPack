import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_HTML_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 5_000;

export type ResourceMetadata = {
  title?: string;
  description?: string;
  previewImageUrl?: string;
  logoUrl?: string;
  domain: string;
};

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [first, second] = address.split('.').map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && second >= 18 && second <= 19) ||
      first >= 224
    );
  }

  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    if (isIP(mapped) === 4) return isPrivateAddress(mapped);
  }
  if (normalized === '::' || normalized === '::1') return true;

  const parts = normalized.split('::');
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const expanded = [
    ...head,
    ...Array(8 - head.length - tail.length).fill('0'),
    ...tail,
  ];
  if (expanded.length !== 8) return true;
  const first = Number.parseInt(expanded[0], 16);
  const second = Number.parseInt(expanded[1], 16);
  const third = Number.parseInt(expanded[2], 16);
  const fourth = Number.parseInt(expanded[3], 16);
  return (
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    (first === 0x2001 && second === 0x0db8) ||
    (first === 0x2001 && second === 0x0000 && third === 0x0db8) ||
    (first === 0x2001 && second === 0x0000 && third === 0x0000 && fourth === 0x0000)
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html: string, attribute: 'property' | 'name', value: string) {
  const expression = new RegExp(`<meta[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["'][^>]*>`, 'i');
  const match = html.match(expression);
  return match?.[1] ?? match?.[2];
}

function resolveUrl(value: string | undefined, baseUrl: URL) {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl);
    return ['http:', 'https:'].includes(resolved.protocol) ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class ResourceMetadataService {
  private async validateTarget(url: URL) {
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS URLs are supported.');
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new BadRequestException('Local URLs cannot be previewed.');
    }

    if (isIP(hostname)) {
      if (isPrivateAddress(hostname)) throw new BadRequestException('Private network URLs cannot be previewed.');
      return;
    }

    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new BadRequestException('Private network URLs cannot be previewed.');
    }
  }

  private async readHtml(response: Response) {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
      throw new BadRequestException('The page is too large to preview.');
    }

    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new BadRequestException('The page is too large to preview.');
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
  }

  async fetchMetadata(rawUrl: string): Promise<ResourceMetadata> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Enter a valid URL.');
    }
    await this.validateTarget(url);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'user-agent': 'SWEPack metadata preview' },
      });
    } catch {
      throw new BadRequestException('The website could not be reached.');
    }

    if (!response.ok) throw new BadRequestException('The website could not be previewed.');
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) throw new BadRequestException('This URL does not point to an HTML page.');

    const html = await this.readHtml(response);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = decodeHtml(metaContent(html, 'property', 'og:title') ?? metaContent(html, 'name', 'twitter:title') ?? titleMatch?.[1] ?? '');
    const description = decodeHtml(metaContent(html, 'property', 'og:description') ?? metaContent(html, 'name', 'description') ?? metaContent(html, 'name', 'twitter:description') ?? '');
    const previewImageUrl = resolveUrl(metaContent(html, 'property', 'og:image') ?? metaContent(html, 'name', 'twitter:image'), url);
    const iconMatch = html.match(/<link[^>]*rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i);

    return {
      domain: url.hostname.replace(/^www\./, ''),
      ...(title && { title: title.slice(0, 150) }),
      ...(description && { description: description.slice(0, 500) }),
      ...(previewImageUrl && { previewImageUrl }),
      logoUrl: resolveUrl(iconMatch?.[1], url) ?? `${url.origin}/favicon.ico`,
    };
  }
}
