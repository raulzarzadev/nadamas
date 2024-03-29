import NextHead from 'next/head'

export function Head({ title='nadamas', children = null }) {
  return (
    <NextHead>
      {title && <title>{title}</title>}

      <link rel="shortcut icon" href="/favicon.ico" />
      <meta name='application-name' content='PWA App' />
      <meta name='apple-mobile-web-app-capable' content='yes' />
      <meta name='apple-mobile-web-app-status-bar-style' content='default' />
      <meta name='apple-mobile-web-app-title' content='PWA App' />
      <meta name='description' content='Best PWA App in the world' />
      <meta name='format-detection' content='telephone=no' />
      <meta name='mobile-web-app-capable' content='yes' />
      <meta name='msapplication-TileColor' content='#2B5797' />
      <meta name='msapplication-tap-highlight' content='no' />
      <meta name="theme-color" content="#317EFB" />

      <link rel='apple-touch-icon' sizes='120x128' href='/icons/icon_x128.png' />
      <link rel='apple-touch-icon' sizes='192x192' href='/icons/icon_x192.png' />
      <link rel='apple-touch-icon' sizes='512x512' href='/icons/icon_x512.png' />

      <link rel='manifest' href='/manifest.json' />
      <link rel='mask-icon' href='/icons/maskable_icon_x512.png' color='#5bbad5' />
      <link rel='shortcut icon' href='/favicon.ico' />

      {/*       <meta name='twitter:card' content='summary' />
      <meta name='twitter:url' content='https://yourdomain.com' />
      <meta name='twitter:title' content='PWA App' />
      <meta name='twitter:description' content='Best PWA App in the world' />
      <meta name='twitter:image' content='https://yourdomain.com/icons/android-chrome-192x192.png' />
      <meta name='twitter:creator' content='@DavidWShadow' />
      <meta property='og:type' content='website' />
      <meta property='og:title' content='PWA App' />
      <meta property='og:description' content='Best PWA App in the world' />
      <meta property='og:site_name' content='PWA App' />
      <meta property='og:url' content='https://yourdomain.com' />
      <meta property='og:image' content='https://yourdomain.com/icons/apple-touch-icon.png' />
 */}
      {/* <!-- apple splash screen images -->
<!-- */}
      {/*  <link rel='apple-touch-startup-image' href='/images/apple_splash_2048.png' sizes='2048x2732' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_1668.png' sizes='1668x2224' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_1536.png' sizes='1536x2048' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_1125.png' sizes='1125x2436' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_1242.png' sizes='1242x2208' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_750.png' sizes='750x1334' />
      <link rel='apple-touch-startup-image' href='/images/apple_splash_640.png' sizes='640x1136' /> */}
      {/* --> */}
      <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover' />

      <meta
        name="description"
        content="Una aplicación para entrenadores y administradores de actividades deportivas. Mantén la información importante de tus atletas centralizada y organizada. Saca el máximo provecho de tus atletas con estadísticas que te ayudan a planear un mejor entrenamiento personalizado."
      ></meta>
      {children}
    </NextHead>
  )
}
