// Cloudflare Pages Function: GET /api/tasks and POST /api/tasks
interface Env {
  DB: any;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  try {
    const { env } = context;
    const { results } = await env.DB.prepare(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    ).all();

    return new Response(JSON.stringify({ success: true, tasks: results || [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch tasks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const {
      employer_id,
      title,
      description = '',
      category = 'Social Media',
      price = 1000,
      deadline = '3 days',
    } = body;

    if (!title || !employer_id) {
      return new Response(JSON.stringify({ error: 'Missing title or employer ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const taskId = 't-' + crypto.randomUUID().slice(0, 8);
    const numPrice = parseInt(price, 10) || 1000;

    await env.DB.prepare(
      `INSERT INTO tasks (id, employer_id, title, description, category, price, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`
    ).bind(taskId, employer_id, title, description, category, numPrice, deadline).run();

    const task = {
      id: taskId,
      employer_id,
      title,
      description,
      category,
      price: numPrice,
      deadline,
      status: 'open',
    };

    return new Response(JSON.stringify({ success: true, task }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
