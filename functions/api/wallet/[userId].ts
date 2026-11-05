// Cloudflare Pages Function: GET /api/wallet/:userId
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

    let wallet = await env.DB.prepare(
      'SELECT * FROM wallet WHERE user_id = ?'
    ).bind(userId).first();

    if (!wallet) {
      // Check user balance from users table as fallback
      const user = await env.DB.prepare(
        'SELECT balance FROM users WHERE id = ?'
      ).bind(userId).first();

      const userBalance = user?.balance || 0;
      const walletId = crypto.randomUUID();

      await env.DB.prepare(
        'INSERT INTO wallet (id, user_id, balance, escrow_locked) VALUES (?, ?, ?, 0)'
      ).bind(walletId, userId, userBalance).run();

      wallet = {
        id: walletId,
        user_id: userId,
        balance: userBalance,
        escrow_locked: 0,
      };
    }

    const { results: recentTransactions } = await env.DB.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(userId).all();

    return new Response(
      JSON.stringify({
        success: true,
        wallet,
        transactions: recentTransactions || [],
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
