# Push notifications

The PWA uses standard Web Push subscriptions stored in Firestore collection
`pushSubscriptions`.

Required environment variables:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:hola@nadamas.app
```

Generate VAPID keys:

```bash
pnpm exec web-push generate-vapid-keys
```

Notes:

- iOS/iPadOS requires the PWA to be added to the Home Screen before web push can
  work.
- Notification sound is controlled by the operating system and user settings.
  Web Push cannot force a custom sound.
- If `web-push` or the VAPID env vars are missing, in-app notifications still
  work and push sending is skipped.
