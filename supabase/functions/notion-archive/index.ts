const NOTION_TOKEN = Deno.env.get('NOTION_TOKEN')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { notionPageId } = await req.json()
  if (!notionPageId) {
    return new Response(
      JSON.stringify({ error: 'Missing notionPageId' }),
      { status: 400, headers: corsHeaders },
    )
  }

  const res = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ archived: true }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error(`Notion archive failed for ${notionPageId}:`, detail)
    return new Response(
      JSON.stringify({ error: detail }),
      { status: res.status, headers: corsHeaders },
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
