self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.titolo || 'Nuova segnalazione', {
      body: data.corpo || 'È stata ricevuta una nuova segnalazione.',
      icon: '/portale/apple-touch-icon.png',
      tag: data.url || 'nuova-segnalazione',
      data: { url: data.url || '/portale/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data.url))
})
