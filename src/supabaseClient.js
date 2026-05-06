import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://saheeyotshfeowbsitvu.supabase.co'
const supabaseKey = 'sb_publishable_ZlbnRc56Pbck-4sFb5sdZg_vph574Ic'

export const supabase = createClient(supabaseUrl, supabaseKey)
