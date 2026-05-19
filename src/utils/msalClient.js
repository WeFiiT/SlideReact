import { PublicClientApplication } from '@azure/msal-browser'

const CLIENT_ID = '44ce1d99-69ec-403a-a6c1-feda78c0cbc7'
const TENANT_ID = '28dd0381-5845-4bf6-9beb-60cf464a2f0d'

let msalPromise = null

export function getMsal() {
  if (!msalPromise) {
    const instance = new PublicClientApplication({
      auth: {
        clientId:    CLIENT_ID,
        authority:   `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin + '/',
      },
      cache: { cacheLocation: 'sessionStorage' },
    })
    msalPromise = instance.initialize().then(() => instance)
  }
  return msalPromise
}
