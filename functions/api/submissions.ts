// Cloudflare Pages Function: /api/submissions
interface Env {
  DB: any;
  PROOFS: any;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task_id');
    const earnerId = url.searchParams.get('earner_id');

    let query = 'SELECT * FROM submissions ORDER BY created_at DESC';
    let params: any[] = [];

    if (taskId) {
      query = 'SELECT * FROM submissions WHERE task_id = ? ORDER BY created_at DESC';
      params = [taskId];
    } else if (earnerId) {
      query = 'SELECT * FROM submissions WHERE earner_id = ? ORDER BY created_at DESC';
      params = [earnerId];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({ success: true, submissions: results || [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type') || '';

    let taskId = '';
    let earnerId = '';
    let proofLink = '';
    let proofText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      taskId = (formData.get('task_id') as string) || '';
      earnerId = (formData.get('earner_id') as string) || '';
      proofText = (formData.get('proof_text') as string) || '';
      proofLink = (formData.get('proof_link') as string) || '';

      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        const fileExt = file.name.split('.').pop() || 'png';
        const objectKey = `proof_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${fileExt}`;
        
        // Save file to Cloudflare R2 bucket PROOFS
        if (env.PROOFS) {
          await env.PROOFS.put(objectKey, file.stream(), {
            httpMetadata: { contentType: file.type || 'image/png' },
          });
          proofLink = `/uploads/${objectKey}`;
        }
      }
    } else {
      const body: any = await request.json();
      taskId = body.task_id;
      earnerId = body.earner_id;
      proofLink = body.proof_link || '';
      proofText = body.proof_text || '';
    }

    if (!taskId || !earnerId) {
      return new Response(JSON.stringify({ error: 'Missing task_id or earner_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subId = 'sub-' + crypto.randomUUID().slice(0, 8);

    await env.DB.prepare(
      `INSERT INTO submissions (id, task_id, earner_id, proof_link, proof_text, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(subId, taskId, earnerId, proofLink, proofText).run();

    // Update application status to submitted
    await env.DB.prepare(
      'UPDATE applications SET status = "submitted" WHERE task_id = ? AND earner_id = ?'
    ).bind(taskId, earnerId).run();

    const submission = {
      id: subId,
      task_id: taskId,
      earner_id: earnerId,
      proof_link: proofLink,
      proof_text: proofText,
      status: 'pending',
    };

    return new Response(JSON.stringify({ success: true, submission }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
