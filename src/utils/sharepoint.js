import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser'
import { buildNativePptx, buildPptxFilename } from './exportPptx'

const CLIENT_ID = '44ce1d99-69ec-403a-a6c1-feda78c0cbc7'
const TENANT_ID = '28dd0381-5845-4bf6-9beb-60cf464a2f0d'
const SP_HOST   = 'wefiitcom.sharepoint.com'
const SP_SITE   = '/sites/GROWTH'
const SP_FOLDER = 'General/3 - RÉFÉRENCES/Toutes nos références'
const SCOPES    = ['https://graph.microsoft.com/Files.ReadWrite.All']

// Singleton MSAL instance, initialized once
let msalPromise = null
function getMsal() {
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

export async function getToken() {
  const msal     = await getMsal()
  const accounts = msal.getAllAccounts()

  if (accounts.length > 0) {
    try {
      const result = await msal.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] })
      return result.accessToken
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e
    }
  }

  const result = await msal.acquireTokenPopup({ scopes: SCOPES })
  return result.accessToken
}

// Construit l'URL web du fichier SharePoint à partir des données de la slide
export function buildSharePointFileUrl(slide) {
  const filename = `${buildPptxFilename(slide)}.pptx`
  const parts = [...SP_FOLDER.split('/'), filename]
  return `https://${SP_HOST}${SP_SITE}/Shared%20Documents/${parts.map(encodeURIComponent).join('/')}`
}

// Supprime le fichier PPTX de SharePoint
export async function deleteSlideFromSharePoint(slide, token = null) {
  const filename = `${buildPptxFilename(slide)}.pptx`
  const parts = [...SP_FOLDER.split('/'), filename]
  const encodedPath = parts.map(encodeURIComponent).join('/')
  const url = `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:${SP_SITE}:/drive/root:/${encodedPath}`
  if (!token) token = await getToken()
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  // 404 = fichier inexistant, on considère ça OK
  if (!res.ok && res.status !== 404) {
    const detail = await res.text()
    throw new Error(`Suppression SharePoint échouée (${res.status}): ${detail}`)
  }
}

// Génère le PPTX et l'uploade vers le dossier SharePoint cible
// token optionnel : pré-acquis dans le contexte du clic pour éviter le blocage popup
export async function uploadSlideToSharePoint(slide, token = null) {
  const pptx     = await buildNativePptx([slide])
  const blob     = await pptx.getBlob()
  const filename = `${buildPptxFilename(slide)}.pptx`
  if (!token) token = await getToken()

  const encodedPath = [...SP_FOLDER.split('/'), filename].map(encodeURIComponent).join('/')
  const url = `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:${SP_SITE}:/drive/root:/${encodedPath}:/content`

  const res = await fetch(url, {
    method:  'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/octet-stream',
    },
    body: blob,
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Upload SharePoint échoué (${res.status}): ${detail}`)
  }

  const json = await res.json()
  return { filename, webUrl: json.webUrl || null }
}
