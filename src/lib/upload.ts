const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:3000'

export async function uploadToR2(file: File, folder = 'announcements'): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await fetch(`${PORTAL_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      console.error('[UPLOAD] Failed:', res.status, await res.text())
      return null
    }

    const { url } = await res.json()
    return url
  } catch (err) {
    console.error('[UPLOAD] Error:', err)
    return null
  }
}
