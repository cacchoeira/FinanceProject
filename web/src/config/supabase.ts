// src/config/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 1. We IMPORT createClient from the library.
// 2. We DECLARE a NEW constant called "supabase".
// 3. We EXPORT this new constant so other files can use it.
export const supabase = createClient(supabaseUrl, supabaseKey)