// Cloudflare Pages Function: POST /api/activation/submit
interface Env {
  DB: any;
  PROOFS: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type') || '';

    let userId = '';
    let email = '';
    let proofImageUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      userId = (formData.get('user_id') as string) || '';
      email = (formData.get('email') as string) || '';
      proofImageUrl = (formData.get('proof_image') as string) || '';

      const file = formData.get('proof') as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split('.').pop() || 'jpg';
        const objectKey = `activation/${userId}-${Date.now()}.${ext}`;

        // Upload to Cloudflare R2 bucket PROOFS
        if (env.PROOFS) {
          await env.PROOFS.put(objectKey, file.stream(), {
            httpMetadata: { contentType: file.type || 'image/jpeg' },
          });
          proofImageUrl = `/uploads/${objectKey}`;
        }
      }
    } else {
      const body: any = await request.json();
      userId = body.user_id;
      email = body.email;
      proofImageUrl = body.proof_image || body.proof || '';
    }

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing user_id or email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!proofImageUrl) {
      return new Response(JSON.stringify({ error: 'Please upload a proof of payment screenshot' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const paymentId = 'act_' + crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Check if user already has an existing pending or rejected record
    const existing = await env.DB.prepare(
      'SELECT id FROM activation_payments WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).first();

    if (existing) {
      await env.DB.prepare(
        `UPDATE activation_payments 
         SET proof_image = ?, status = 'pending', admin_note = NULL, created_at = ?
         WHERE id = ?`
      ).bind(proofImageUrl, nowIso, existing.id).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO activation_payments (id, user_id, email, amount, proof_image, status, admin_note, created_at)
         VALUES (?, ?, ?, 1500, ?, 'pending', NULL, ?)`
      ).bind(paymentId, userId, email, proofImageUrl, nowIso).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Proof submitted successfully. Awaiting admin approval.',
        proof_image: proofImageUrl,
        status: 'pending',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
