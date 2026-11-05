// Cloudflare Pages Function: POST /api/admin/activations/approve
interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { id, user_id } = body;

    if (!id && !user_id) {
      return new Response(JSON.stringify({ error: 'Missing activation id or user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();

    if (id) {
      await env.DB.prepare(
        `UPDATE activation_payments SET status = 'approved', admin_note = 'Approved by Admin' WHERE id = ?`
      ).bind(id).run();
    }

    const targetUserId = user_id || (await env.DB.prepare('SELECT user_id FROM activation_payments WHERE id = ?').bind(id).first())?.user_id;

    if (targetUserId) {
      await env.DB.prepare(
        `UPDATE users SET is_activated = 1, activation_paid_at = ? WHERE id = ?`
      ).bind(nowIso, targetUserId).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment approved. Earner account activated successfully.',
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
