// Cloudflare Pages Function: POST /api/upload/presigned-url
interface Env {
  DB?: any;
  PROOFS?: any;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request } = context;
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      body = {};
    }

    const userId = body.userId || body.user_id || 'anonymous';
    const folder = body.folder || 'activation';
    const contentType = body.contentType || 'image/jpeg';
    const ext = body.filename?.split('.').pop() || 'jpg';

    const timestamp = Date.now();
    const cleanKey = `${folder}/${userId}-${timestamp}.${ext}`;
    
    // Direct worker upload endpoint that saves to R2 bucket without exposing client secrets
    const uploadUrl = `/api/upload/direct?key=${encodeURIComponent(cleanKey)}`;
    const publicUrl = `/uploads/${cleanKey}`;

    return new Response(
      JSON.stringify({
        success: true,
        uploadUrl,
        publicUrl,
        key: cleanKey,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to generate upload URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
