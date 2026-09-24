import { api } from './api'

const base64 = (value: string) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export async function notificheAttive(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration('/portale/')
  return Boolean(await registration?.pushManager.getSubscription())
}

export async function attivaNotifiche(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const { data } = await api.GET('/auth/push-subscription')
  if (!data?.public_key) return false
  const registration = await navigator.serviceWorker.register('/portale/push-sw.js')
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64(data.public_key) })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false
  const result = await api.POST('/auth/push-subscription', { body: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth } })
  return !result.error
}

export async function disattivaNotifiche(): Promise<boolean> {
  const registration = await navigator.serviceWorker.getRegistration('/portale/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return true
  const result = await api.DELETE('/auth/push-subscription', { body: { endpoint: subscription.endpoint } })
  if (result.error) return false
  return subscription.unsubscribe()
}
