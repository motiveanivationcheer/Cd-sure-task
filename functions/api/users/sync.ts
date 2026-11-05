// Cloudflare Pages Function: POST /api/users/sync
interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const id = body.id || body.uid;
    const name = body.name || body.displayName || 'Member';
    const email = body.email || '';
    const role = body.role === 'employer' ? 'employer' : 'earner';

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user exists in D1
    const existing: any = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    if (existing) {
      // Ensure wallet exists
      const wallet = await env.DB.prepare('SELECT * FROM wallet WHERE user_id = ?').bind(id).first();
      if (!wallet) {
        const walletId = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, ?, ?)'
        ).bind(walletId, id, existing.balance || 0, 0).run();
      }

      // If user is employer, employer does not require activation
      const isActivated =
        existing.role === 'employer' ? 1 : existing.is_activated ? 1 : 0;

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            ...existing,
            is_activated: isActivated,
          },
          created: false,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Employers are active immediately; Earners must pay ₦1500 activation fee
    const initialActivation = role === 'employer' ? 1 : 0;

    // Insert new user into D1
    await env.DB.prepare(
      'INSERT INTO users (id, name, email, role, balance, is_activated) VALUES (?, ?, ?, ?, 0, ?)'
    ).bind(id, name, email, role, initialActivation).run();

    // Create wallet record for user
    const walletId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, 0, 0)'
    ).bind(walletId, id).run();

    const newUser = {
      id,
      name,
      email,
      role,
      balance: 0,
      is_activated: initialActivation,
    };

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser,
        created: true,
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
