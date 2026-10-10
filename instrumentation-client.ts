import posthog from 'posthog-js'
import { analyticsEnabled } from '@/lib/analytics/client'
import {
  analyticsRoute,
  privateReplayRoute,
  sanitizeAnalyticsProperties,
} from '@/lib/analytics/privacy'

if (analyticsEnabled()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.includes('eu.')
      ? 'https://eu.posthog.com'
      : 'https://us.posthog.com',
    defaults: '2025-05-24',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    disable_session_recording: privateReplayRoute(window.location.pathname),
    autocapture: { dom_event_allowlist: ['click', 'submit'], capture_copied_text: false },
    mask_all_element_attributes: true,
    mask_all_text: true,
    rageclick: true,
    capture_dead_clicks: true,
    capture_performance: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      blockSelector:
        '.ph-no-capture, .ph-sensitive, [data-analytics-private], img, iframe, canvas, video',
      recordCrossOriginIframes: false,
      captureCanvas: { recordCanvas: false },
      recordHeaders: false,
      recordBody: false,
      maskCapturedNetworkRequestFn: (request) => ({
        ...request,
        name: analyticsRoute(request.name),
        requestHeaders: undefined,
        responseHeaders: undefined,
        requestBody: undefined,
        responseBody: undefined,
      }),
    },
    before_send: (event) => {
      if (!event) return null
      // Never replay sign-in links: their URL can carry one-time credentials.
      if (event.event === '$snapshot' && privateReplayRoute(window.location.pathname)) return null
      if (event.event !== '$snapshot')
        event.properties = sanitizeAnalyticsProperties(event.properties)
      return event
    },
    loaded: (client) =>
      client.register({
        app: 'nadamas',
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_APP_RELEASE || 'local',
      }),
  })
}
