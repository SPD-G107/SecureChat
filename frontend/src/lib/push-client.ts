import { ApiClient } from './api-client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    return await registerPushSubscription();
  } catch (err: any) {
    console.warn('Failed to request push notification permission:', err);
    return false;
  }
}

export async function registerPushSubscription(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;

    // Check if already subscribed
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      // Get VAPID public key from backend
      const res = await ApiClient.get('/push/vapid-public-key');
      if (!res?.publicKey) {
        return false;
      }

      const convertedKey = urlBase64ToUint8Array(res.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    if (subscription) {
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await ApiClient.post('/push/subscribe', {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
          },
        });
        return true;
      }
    }
    return false;
  } catch (err: any) {
    console.warn('Web Push subscription registration error:', err);
    return false;
  }
}
