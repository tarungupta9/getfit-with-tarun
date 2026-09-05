const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/

export function getYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null

    let videoId: string | null = null
    if (
      (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') &&
      url.pathname === '/watch'
    ) {
      videoId = url.searchParams.get('v')
    } else if (url.hostname === 'youtu.be') {
      const pathParts = url.pathname.split('/').filter(Boolean)
      videoId = pathParts.length === 1 ? pathParts[0]! : null
    }

    return videoId && youtubeVideoIdPattern.test(videoId) ? videoId : null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value)
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null
}
