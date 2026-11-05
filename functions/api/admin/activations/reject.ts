// Cloudflare Pages Function: POST /api/admin/activations/reject
interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { id, user_id, reason } = body;

    if (!id && !user_id) {
      return new Response(JSON.stringify({ error: 'Missing activation id or user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const note = reason || 'Payment proof verification failed. Please check details and re-upload valid proof.';

    if (id) {
      await env.DB.prepare(
        `UPDATE activation_payments SET status = 'rejected', admin_note = ? WHERE id = ?`
      ).bind(note, id).run();
    }

    const targetUserId = user_id || (await env.DB.prepare('SELECT user_id FROM activation_payments WHERE id = ?').bind(id).first())?.user_id;

    if (targetUserId) {
      await env.DB.prepare(
        `UPDATE users SET is_activated = 0 WHERE id = ?`
      ).bind(targetUserId).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment rejected. Earner notified with feedback note.',
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
