import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const CACHE_KEY = 'rabahtec_server_url';
const PORT = 4000;
const PING_TIMEOUT_MS = 1500;
const SCAN_BATCH_SIZE = 32;

// نضع رابط الاستضافة الحقيقي هنا بعد نشر الـ Backend.
export const CLOUD_SERVER_URL = 'https://rabah-tec-react.onrender.com';

async function pingUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const res = await fetch(`${url}/ping`, {
      signal: controller.signal,
    });

    if (!res.ok) return false;

    const data = await res.json();
    return !!data?.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function getLocalSubnetPrefix(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();

    if (!ip || ip === '0.0.0.0') return null;

    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    return parts.slice(0, 3).join('.');
  } catch {
    return null;
  }
}

async function scanLocalNetwork(
  prefix: string
): Promise<string | null> {
  for (let start = 1; start <= 254; start += SCAN_BATCH_SIZE) {
    const end = Math.min(start + SCAN_BATCH_SIZE - 1, 254);
    const candidates: Promise<{ url: string; ok: boolean }>[] = [];

    for (let i = start; i <= end; i++) {
      const url = `http://${prefix}.${i}:${PORT}`;

      candidates.push(
        pingUrl(url).then((ok) => ({
          url,
          ok,
        }))
      );
    }

    const results = await Promise.all(candidates);
    const found = results.find((r) => r.ok);

    if (found) return found.url;
  }

  return null;
}

export async function discoverServerUrl(
  onStatus?: (msg: string) => void
): Promise<{
  url: string;
  mode: 'cached' | 'local' | 'cloud';
} | null> {
  const cached = await AsyncStorage.getItem(CACHE_KEY);

  if (cached) {
    onStatus?.('جارٍ التحقق من آخر سيرفر معروف...');

    if (await pingUrl(cached)) {
      return {
        url: cached,
        mode: 'cached',
      };
    }
  }

  onStatus?.('جارٍ البحث عن السيرفر على شبكة الواي فاي...');

  const prefix = await getLocalSubnetPrefix();

  if (prefix) {
    const found = await scanLocalNetwork(prefix);

    if (found) {
      await AsyncStorage.setItem(CACHE_KEY, found);

      return {
        url: found,
        mode: 'local',
      };
    }
  }

  onStatus?.('لا يوجد سيرفر محلي، جارٍ المحاولة عبر الإنترنت...');

  if (
    CLOUD_SERVER_URL &&
    !CLOUD_SERVER_URL.includes('YOUR-CLOUD-SERVER')
  ) {
    if (await pingUrl(CLOUD_SERVER_URL)) {
      await AsyncStorage.setItem(CACHE_KEY, CLOUD_SERVER_URL);

      return {
        url: CLOUD_SERVER_URL,
        mode: 'cloud',
      };
    }
  }

  return null;
}

export async function resolveServerUrl(): Promise<string | null> {
  const result = await discoverServerUrl();

  return result?.url ?? null;
}

export async function resolveAndConnect(): Promise<string | null> {
  return resolveServerUrl();
}

export async function saveCloudServerUrl(url: string) {
  const cleanUrl = url.trim().replace(/\/+$/, '');

  await AsyncStorage.setItem('rabah_cloud_server_url', cleanUrl);
}

export async function getCloudServerUrl(): Promise<string | null> {
  const url = await AsyncStorage.getItem('rabah_cloud_server_url');

  return url ? url.trim().replace(/\/+$/, '') : null;
}

export async function forgetCachedServer() {
  await AsyncStorage.removeItem(CACHE_KEY);
}
