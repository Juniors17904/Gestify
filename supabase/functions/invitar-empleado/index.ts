import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { email, nombre, rol, negocio_id, negocio_nombre } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Invitar usuario por email
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, rol, negocio_id },
    redirectTo: `${Deno.env.get('SITE_URL') || 'https://gestify-livid.vercel.app'}/dashboard.html`
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Insertar en tabla empleados
  await supabaseAdmin.from('empleados').insert({
    negocio_id,
    nombre,
    email,
    rol,
    user_id: data.user?.id
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
