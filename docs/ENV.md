# Environment Variables

## Required now

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_CONFIG` | client | Firebase web app config as a JSON string. Consumed by `firebase/` client init. Already present in `.env.local`. |

## Placeholders (add when the corresponding feature lands)

### Firebase Admin (server-side)

| Variable | Description |
| --- | --- |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase project id for the Admin SDK |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key (escape newlines as `\n`) |

### Mercado Pago

| Variable | Description |
| --- | --- |
| `MP_ACCESS_TOKEN` | Mercado Pago access token (server) |
| `MP_CLIENT_ID` | Mercado Pago OAuth client id |
| `MP_CLIENT_SECRET` | Mercado Pago OAuth client secret |
| `MP_WEBHOOK_SECRET` | Secret used to verify Mercado Pago webhooks |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Mercado Pago public key (client) |
| `MP_REDIRECT_URI` | OAuth redirect URI |

### App

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the deployed app |

## Notes

- `.env.local` holds local secrets and is gitignored. Do not commit it.
- Production/preview values are managed via Vercel project environment variables.
