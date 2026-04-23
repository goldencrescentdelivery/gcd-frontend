self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() || {} } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'GCD Notice', {
      body:    data.body || '',
      icon:    '/logo.webp',
      badge:   '/logo.webp',
      data:    { url: data.url || '/driver' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/driver'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes(url))
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
