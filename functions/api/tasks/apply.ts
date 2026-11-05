// Cloudflare Pages Function: POST /api/tasks/apply
interface Env {
  DB: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { task_id, earner_id } = body;

    if (!task_id || !earner_id) {
      return new Response(JSON.stringify({ error: 'Missing task_id or earner_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already applied
    const existing = await env.DB.prepare(
      'SELECT * FROM applications WHERE task_id = ? AND earner_id = ?'
    ).bind(task_id, earner_id).first();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, application: existing, message: 'Already accepted' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appId = 'app-' + crypto.randomUUID().slice(0, 8);
    await env.DB.prepare(
      'INSERT INTO applications (id, task_id, earner_id, status) VALUES (?, ?, ?, "accepted")'
    ).bind(appId, task_id, earner_id).run();

    return new Response(
      JSON.stringify({
        success: true,
        application: { id: appId, task_id, earner_id, status: 'accepted' },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to accept task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
