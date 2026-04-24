const QUEUE_KEY = 'gcd_offline_queue'

// Add a failed request to the offline queue
export function enqueue(entry) {
  const queue = getQueue()
  queue.push({ ...entry, queued_at: new Date().toISOString() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// Remove the first item from the queue
export function dequeue() {
  const queue = getQueue()
  const item  = queue.shift()
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return item
}

export function getPendingCount() {
  return getQueue().length
}

function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Replay all queued requests in order, removing each on success
export async function replayQueue() {
  const queue = getQueue()
  if (!queue.length) return { replayed: 0, failed: 0 }

  let replayed = 0
  let failed   = 0
  const remaining = []

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method:      item.method || 'POST',
        headers:     { 'Content-Type': 'application/json', ...(item.headers || {}) },
        credentials: 'include',
        body:        item.body ? JSON.stringify(item.body) : undefined,
      })

      if (res.ok) {
        replayed++
      } else {
        // Non-network error (e.g. 400/403) — drop it, not retryable
        console.warn('[offline] dropping non-retryable item:', item.url, res.status)
        replayed++
      }
    } catch {
      // Still offline — keep in queue
      remaining.push(item)
      failed++
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  return { replayed, failed }
}

// Register a Background Sync tag so the SW replays when connection returns
export async function registerBackgroundSync() {
  if (typeof window === 'undefined') return false
  try {
    const reg = await navigator.serviceWorker?.ready
    if (!reg?.sync) return false
    await reg.sync.register('gcd-offline-queue')
    return true
  } catch {
    return false
  }
}

// Listen for the SW's replay message and run replayQueue in the page context
// (the SW posts SW_REPLAY_QUEUE to all clients when sync fires)
export function listenForSWReplay() {
  if (typeof window === 'undefined') return
  navigator.serviceWorker?.addEventListener('message', async (event) => {
    if (event.data?.type === 'SW_REPLAY_QUEUE') {
      const result = await replayQueue()
      if (result.replayed > 0) {
        console.log(`[offline] replayed ${result.replayed} queued actions`)
        window.dispatchEvent(new CustomEvent('offline:replayed', { detail: result }))
      }
    }
  })
}
