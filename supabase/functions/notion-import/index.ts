const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const notionHeaders = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

function getProp(page: any, name: string): string {
  const p = page.properties[name]
  if (!p) return ''
  switch (p.type) {
    case 'title':     return p.title.map((t: any) => t.plain_text).join('')
    case 'rich_text': return p.rich_text.map((t: any) => t.plain_text).join('')
    case 'select':    return p.select?.name ?? ''
    case 'url':       return p.url ?? ''
    case 'date':      return p.date?.start ?? ''
    default:          return ''
  }
}

async function uploadLogoFromNotion(
  page: any,
  sbHeaders: Record<string, string>,
): Promise<string | null> {
  // Cherche la propriété logo (insensible à la casse)
  const p = Object.values(page.properties).find(
    (v: any) => v.type === 'files' && (
      Object.keys(page.properties).find(k => page.properties[k] === v)
        ?.toLowerCase().includes('logo')
    )
  ) as any
  if (!p?.files?.length) return null

  const file = p.files[0]
  const fileUrl = file.type === 'file' ? file.file?.url : file.external?.url
  const fileName: string = file.name || 'logo.png'
  if (!fileUrl) return null

  // Télécharger depuis Notion (URL signée, expire rapidement)
  const dlRes = await fetch(fileUrl)
  if (!dlRes.ok) return null

  const blob = await dlRes.blob()
  const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
  const path = `logo_notion_${Date.now()}.${ext}`

  // Uploader dans Supabase Storage bucket "logos"
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${path}`, {
    method: 'POST',
    headers: {
      'apikey': sbHeaders['apikey'],
      'Authorization': sbHeaders['Authorization'],
      'Content-Type': blob.type || 'image/png',
      'x-upsert': 'true',
    },
    body: blob,
  })
  if (!uploadRes.ok) {
    console.error('Logo upload failed:', await uploadRes.text())
    return null
  }

  return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}`
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const body = await req.json()
  // Notion automation envoie { data: { id: "..." } } ou { pageId: "..." }
  const pageId: string = body.data?.id || body.pageId || body.page?.id
  if (!pageId) {
    return new Response(JSON.stringify({ error: 'Missing pageId' }), { status: 400, headers: corsHeaders })
  }

  // Lire la page Notion
  const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: notionHeaders,
  })
  const page = await notionRes.json()
  if (!notionRes.ok) {
    return new Response(JSON.stringify(page), { status: 500, headers: corsHeaders })
  }

  const sbHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }

  // Upload du logo depuis Notion → Supabase Storage
  const logoUrl = await uploadLogoFromNotion(page, sbHeaders)

  // Mapper les propriétés Notion → champs slide
  const slide = {
    notion_page_id:     pageId,
    prenom:             getProp(page, 'Prénom') || null,
    nom:                getProp(page, 'Nom') || null,
    card_titre:         getProp(page, 'Titre de la carte') || null,
    type_mission:       getProp(page, 'Type de mission') || null,
    titre:              getProp(page, 'Titre') || null,
    sous_titre:         getProp(page, 'Sous-titre') || null,
    contexte:           [1, 2, 3].map(n => getProp(page, `Contexte ${n}`)),
    tags:               [1, 2, 3, 4].map(n => getProp(page, `Tag ${n}`)),
    perimetre:          [1, 2, 3].map(n => getProp(page, `Périmètre ${n}`)),
    enjeux:             [1, 2, 3].map(n => getProp(page, `Enjeux ${n}`)),
    impact:             [1, 2, 3].map(n => getProp(page, `Impact ${n}`)),
    logo_url:           logoUrl || getProp(page, 'Logo URL') || null,
    metrique_1_chiffre: getProp(page, 'Métrique 1 - Chiffre') || null,
    metrique_1_label:   getProp(page, 'Métrique 1 - Label') || null,
    metrique_2_chiffre: getProp(page, 'Métrique 2 - Chiffre') || null,
    metrique_2_label:   getProp(page, 'Métrique 2 - Label') || null,
    metrique_3_chiffre: getProp(page, 'Métrique 3 - Chiffre') || null,
    metrique_3_label:   getProp(page, 'Métrique 3 - Label') || null,
  }

  // Chercher si un slide existe déjà avec ce notion_page_id
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/slides?notion_page_id=eq.${pageId}&select=id`,
    { headers: sbHeaders },
  )
  const existing: Array<{ id: string }> = await checkRes.json()

  let slideId: string
  if (existing.length > 0) {
    slideId = existing[0].id
    await fetch(`${SUPABASE_URL}/rest/v1/slides?id=eq.${slideId}`, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify(slide),
    })
  } else {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/slides`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(slide),
    })
    const inserted: Array<{ id: string }> = await insertRes.json()
    slideId = inserted[0]?.id
  }

  // Écrire l'URL de la slide dans la propriété "Slide" de Notion
  const slideUrl = `https://slidereact.rodserver.fr/preview/${slideId}`
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders,
    body: JSON.stringify({ properties: { 'Slide URL': { url: slideUrl } } }),
  })

  return new Response(
    JSON.stringify({ slideId, url: slideUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
