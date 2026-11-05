// Cloudflare Pages Function: GET /api/admin/activations
interface Env {
  DB: any;
}

export const onRequestGet = async (context: { env: Env }) => {
  try {
    const { env } = context;

    const payments = await env.DB.prepare(
      `SELECT p.id, p.user_id, p.email, p.amount, p.proof_image, p.status, p.admin_note, p.created_at,
              u.name as user_name, u.role as user_role, u.is_activated
       FROM activation_payments p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        activations: payments.results || [],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
