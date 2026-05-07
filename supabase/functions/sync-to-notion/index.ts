function text(value: string | null | undefined) {
  return { rich_text: [{ text: { content: value?.trim() ?? '' } }] }
}

function slideToProps(s: any) {
  return {
    'Titre de la carte': { title: [{ text: { content: s.card_titre?.trim() ?? '' } }] },
    'Prénom':            text(s.prenom),
    'Nom':               text(s.nom),
    'Type de mission':   s.type_mission ? { select: { name: s.type_mission } } : { select: null },
    'Slide ID':          text(s.id),
    'Titre':             text(s.titre),
    'Sous-titre':        text(s.sous_titre),
    'Contexte 1':        text(s.contexte?.[0]),
    'Contexte 2':        text(s.contexte?.[1]),
    'Contexte 3':        text(s.contexte?.[2]),
    'Tag 1':             text(s.tags?.[0]),
    'Tag 2':             text(s.tags?.[1]),
    'Tag 3':             text(s.tags?.[2]),
    'Tag 4':             text(s.tags?.[3]),
    'Périmètre 1':       text(s.perimetre?.[0]),
    'Périmètre 2':       text(s.perimetre?.[1]),
    'Périmètre 3':       text(s.perimetre?.[2]),
    'Enjeux 1':          text(s.enjeux?.[0]),
    'Enjeux 2':          text(s.enjeux?.[1]),
    'Enjeux 3':          text(s.enjeux?.[2]),
    'Impact 1':          text(s.impact?.[0]),
    'Impact 2':          text(s.impact?.[1]),
    'Impact 3':          text(s.impact?.[2]),
    'Métrique 1 - Chiffre': text(s.metrique_1_chiffre),
    'Métrique 1 - Label':   text(s.metrique_1_label),
    'Métrique 2 - Chiffre': text(s.metrique_2_chiffre),
    'Métrique 2 - Label':   text(s.metrique_2_label),
    'Métrique 3 - Chiffre': text(s.metrique_3_chiffre),
    'Métrique 3 - Label':   text(s.metrique_3_label),
  }
}

Deno.serve(async (req) => {
  // Toujours 200 vers le webhook pour éviter les retries
  const ok = new Response('OK', { status: 200 })

  const NOTION_TOKEN       = Deno.env.get('NOTION_TOKEN')
  const NOTION_DB_ID       = Deno.env.get('NOTION_DATABASE_ID')
  const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    console.error('Missing env vars — NOTION_TOKEN:', !!NOTION_TOKEN, 'NOTION_DB_ID:', !!NOTION_DB_ID)
    return ok
  }

  const notionHeaders = {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  let slide: any
  try {
    const body = await req.json()
    slide = body.record
  } catch (e) {
    console.error('JSON parse error:', e)
    return ok
  }

  if (!slide) return ok

  const props = slideToProps(slide)

  try {
    if (slide.notion_page_id) {
      const res = await fetch(`https://api.notion.com/v1/pages/${slide.notion_page_id}`, {
        method: 'PATCH',
        headers: notionHeaders,
        body: JSON.stringify({ properties: props }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Notion PATCH error:', JSON.stringify(data))
      } else {
        console.log('Notion PATCH OK for page', slide.notion_page_id)
      }
    } else {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties: props }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Notion POST error:', JSON.stringify(data))
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/slides?id=eq.${slide.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY!,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ notion_page_id: data.id }),
        })
        console.log('Notion page created:', data.id)
      }
    }
  } catch (e) {
    console.error('Unexpected error:', String(e))
  }

  return ok
})
