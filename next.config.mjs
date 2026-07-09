const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const frameDenyHeader = { key: 'X-Frame-Options', value: 'DENY' }

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // Storage emulator serves from a private IP (127.0.0.1); the optimizer
    // refuses to fetch private IPs, so skip optimization in emulator mode only.
    ...(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR ? { unoptimized: true } : {}),
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'img.icons8.com' },
      // Storage emulator (dev only): uploaded images are served from 127.0.0.1.
      ...(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR
        ? [{ protocol: 'http', hostname: '127.0.0.1', port: '9199' }]
        : []),
    ],
  },
  async redirects() {
    return [
      { source: '/dashboard/profile', destination: '/profile', permanent: false },
      { source: '/dashboard/events', destination: '/athlete/progress', permanent: false },
      {
        source: '/dashboard/events/:path*',
        destination: '/athlete/progress/:path*',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://nandapaz.com https://www.nandapaz.com https://abdon.mx https://www.abdon.mx http://localhost:*",
          },
        ],
      },
      {
        source: '/:path((?!embed(?:/|$)).*)',
        headers: [...securityHeaders, frameDenyHeader],
      },
      {
        source: '/logo-nadamas.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/og-nadamas.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
export default nextConfig
