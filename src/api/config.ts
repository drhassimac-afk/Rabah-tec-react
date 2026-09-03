// اكتشاف السيرفر المحلي تلقائياً + التحول للسيرفر السحابي عند الفشل
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const CACHE_KEY = 'rabahtec_server_url';
const PORT = 4000;
const PING_TIMEOUT_MS = 700;

// عدّل هذا الرابط بعد نشر السيرفر على استضافة سحابية (Render/Railway/...)
export const CLOUD_SERVER_URL = 'https://YOUR-CLOUD-SERVER.example.com';

async function pingUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(`${url}/ping`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.ok;
  } catch {
    return false;
  }
}

async function getLocalSubnetPrefix(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    if (!ip || ip === '0.0.0.0') return null;
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return parts.slice(0, 3).join('.'); // مثال: 192.168.1
  } catch {
    return null;
  }
}

// يفحص كل عناوين الشبكة المحلية (1-254) بالتوازي، ويرجع أول عنوان يرد عليه /ping
async function scanLocalNetwork(prefix: string): Promise<string | null> {
  const candidates: Promise<{ url: string; ok: boolean }>[] = [];
  for (let i = 1; i <= 254; i++) {
    const url = `http://${prefix}.${i}:${PORT}`;
    candidates.push(pingUrl(url).then((ok) => ({ url, ok })));
  }
  const results = await Promise.all(candidates);
  const found = results.find((r) => r.ok);
  return found ? found.url : null;
}

/**
 * يحاول بالترتيب:
 * 1) آخر رابط سيرفر نجح سابقاً (محفوظ محلياً)
 * 2) مسح الشبكة المحلية (WiFi) بحثاً عن السيرفر
 * 3) السيرفر السحابي كخيار أخير (fallback)
 */
export async function discoverServerUrl(
  onStatus?: (msg: string) => void
): Promise<{ url: string; mode: 'cached' | 'local' | 'cloud' } | null> {
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (cached) {
    onStatus?.('جارٍ التحقق من آخر سيرفر معروف...');
    if (await pingUrl(cached)) {
      return { url: cached, mode: 'cached' };
    }
  }

  onStatus?.('جارٍ البحث عن السيرفر على شبكة الواي فاي...');
  const prefix = await getLocalSubnetPrefix();
  if (prefix) {
    const found = await scanLocalNetwork(prefix);
    if (found) {
      await AsyncStorage.setItem(CACHE_KEY, found);
      return { url: found, mode: 'local' };
    }
  }

  onStatus?.('لا يوجد سيرفر محلي، جارٍ المحاولة عبر الإنترنت...');
  if (CLOUD_SERVER_URL && !CLOUD_SERVER_URL.includes('YOUR-CLOUD-SERVER')) {
    if (await pingUrl(CLOUD_SERVER_URL)) {
      await AsyncStorage.setItem(CACHE_KEY, CLOUD_SERVER_URL);
      return { url: CLOUD_SERVER_URL, mode: 'cloud' };
    }
  }

  return null;
}

export async function forgetCachedServer() {
  await AsyncStorage.removeItem(CACHE_KEY);
}
