// Pages Functions entry - catches all /api/* requests
// Delegates to the Hono app which handles routing internally
import workbenchApp from '../_lib/index'

export const onRequest: PagesFunction = async (context) => {
  try {
    const response = await workbenchApp.fetch(context.request, context.env, context)
    return response
  } catch (err: any) {
    console.error('[Pages Functions] Error:', err?.message || err)
    console.error('[Pages Functions] Stack:', err?.stack || 'no stack')
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal error', 
      details: err?.message || String(err) 
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
