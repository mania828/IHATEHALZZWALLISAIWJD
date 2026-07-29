// ============================================================================
// HALZZ WALL — Supabase client config
//
// Fill these in once you've created your Supabase project:
//   Supabase dashboard → Project Settings → API
//     Project URL      → SUPABASE_URL
//     anon public key  → SUPABASE_ANON_KEY
//
// The anon key is safe to expose in client-side code — it only grants
// whatever access your Row Level Security policies allow (see schema.sql).
// Never put your service_role key or Cloudflare API token in this file.
// ============================================================================

export const SUPABASE_URL = "https://soguifdglqloxfbxtiug.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_CWjfIJEET26ucFpreWIbsA_Dz3T9CGF";

// URL of your deployed create-upload-url Edge Function.
// Looks like: https://xxxx.supabase.co/functions/v1/create-upload-url
export const CREATE_UPLOAD_URL_ENDPOINT = "https://soguifdglqloxfbxtiug.supabase.co/functions/v1/create-upload-url";

// Cloudflare account subdomain used to embed playback. Find it at:
// Cloudflare dashboard → Stream → any video → "Customer Subdomain"
export const CLOUDFLARE_STREAM_SUBDOMAIN = "YOUR_CLOUDFLARE_STREAM_SUBDOMAIN"; // e.g. customer-xxxx.cloudflarestream.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
