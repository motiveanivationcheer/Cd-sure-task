// Cloudflare Pages Function: PUT /api/upload/direct?key=...
interface Env {
  PROOFS?: any;
}

export const onRequestPut = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing object key parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type') || 'image/jpeg';

    // Store directly in Cloudflare R2 bucket
    if (env.PROOFS) {
      await env.PROOFS.put(key, request.body, {
        httpMetadata: { contentType },
      });
    }

    const publicUrl = `/uploads/${key}`;

    return new Response(
      JSON.stringify({
        success: true,
        key,
        publicUrl,
        message: 'Uploaded successfully to Cloudflare R2',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Upload to R2 failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
