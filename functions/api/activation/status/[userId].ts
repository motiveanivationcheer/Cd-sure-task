// Cloudflare Pages Function: GET /api/activation/status/:userId
interface Env {
  DB: any;
}

export const onRequestGet = async (context: {
  params: { userId: string };
  env: Env;
}) => {
  try {
    const { params, env } = context;
    const userId = params.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: any = await env.DB.prepare(
      'SELECT id, role, is_activated, activation_paid_at FROM users WHERE id = ?'
    ).bind(userId).first();

    const payment: any = await env.DB.prepare(
      'SELECT id, amount, proof_image, status, admin_note, created_at FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first();

    const isActivated = (user && (user.role === 'employer' || user.is_activated === 1 || user.is_activated === true)) || (payment && payment.status === 'approved');

    return new Response(
      JSON.stringify({
        success: true,
        is_activated: isActivated,
        role: user ? user.role : 'earner',
        activation_paid_at: user ? user.activation_paid_at : (payment?.status === 'approved' ? payment?.created_at : null),
        payment_status: payment ? payment.status : 'not_submitted',
        proof_image: payment ? payment.proof_image : null,
        admin_note: payment ? payment.admin_note : null,
        created_at: payment ? payment.created_at : null,
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
