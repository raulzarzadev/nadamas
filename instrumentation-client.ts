import posthog from 'posthog-js'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    // Auto SPA pageview + pageleave for App Router, modern defaults
    defaults: '2025-05-24',
    capture_exceptions: true,
  })
}
