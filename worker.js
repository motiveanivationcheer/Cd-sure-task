/**
 * Cloudflare Worker for CDSure Tasks
 * Real Flutterwave Integration, D1 Database, 1-Hour Expiry Rule, Screenshot Proofs & Email Verifications.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function generate6CharReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getTodayMidnightUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const FIREBASE_API_KEY = env.FIREBASE_API_KEY || 'AIzaSyCOmIA6jTV6rmYMdM4x_YvvqkDCKeS1TpA';
    const FLW_SECRET_KEY = env.FLW_SECRET_KEY || 'FLWSECK_TEST-fe383cf2a8f2af55f1bf6622bc672270-X';

    try {
      // 1. POST /api/auth/login
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { idToken, mockUid, mockEmail, fullName, referredBy } = body;

        let uid = mockUid || null;
        let email = mockEmail || '';

        if (idToken && idToken !== 'demo-token') {
          try {
            const verifyRes = await fetch(
              `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              }
            );
            const verifyData = await verifyRes.json();
            if (verifyData.users && verifyData.users.length > 0) {
              uid = verifyData.users[0].localId;
              email = verifyData.users[0].email || email;
            }
          } catch (err) {
            console.warn('Firebase verify error:', err.message);
          }
        }

        if (!uid) {
          return jsonResponse({ error: 'Valid uid is required' }, 400);
        }

        let user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        if (!user) {
          let referralCode = generate6CharReferralCode();
          const existingCode = await env.DB.prepare('SELECT uid FROM users WHERE referral_code = ?')
            .bind(referralCode)
            .first();
          if (existingCode) referralCode = generate6CharReferralCode();

          const createdAt = new Date().toISOString();
          let sanitizedReferredBy = null;

          if (referredBy && typeof referredBy === 'string' && referredBy.trim() !== '') {
            const refCode = referredBy.trim().toUpperCase();
            const referrer = await env.DB.prepare(
              'SELECT uid FROM users WHERE referral_code = ? OR uid = ?'
            )
              .bind(refCode, referredBy.trim())
              .first();

            if (referrer && referrer.uid !== uid) {
              sanitizedReferredBy = referrer.uid;
            }
          }

          await env.DB.prepare(
            `INSERT INTO users (uid, email, full_name, is_activated, referral_code, referred_by, balance, total_earned, referral_earnings, created_at)
             VALUES (?, ?, ?, 0, ?, ?, 0, 0, 0, ?)`
          )
            .bind(uid, email, fullName || 'CDSure Member', referralCode, sanitizedReferredBy, createdAt)
            .run();

          user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
            .bind(uid)
            .first();
        }

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1"
        )
          .bind(uid)
          .first();

        return jsonResponse({
          user,
          hasApprovedPayment: !!approvedPayment,
          isFullyActivated: !!(user.is_activated && approvedPayment),
        });
      }

      // 2. POST /api/verify-flutterwave-payment
      if (path === '/api/verify-flutterwave-payment' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { transaction_id, tx_ref, uid } = body;

        if (!transaction_id || !uid) {
          return jsonResponse({
            approved: false,
            message: 'transaction_id and uid are required',
          }, 400);
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        if (!user) {
          return jsonResponse({ approved: false, message: 'User not found' }, 404);
        }

        let flwData = null;
        try {
          const flwRes = await fetch(
            `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
            {
              headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );
          flwData = await flwRes.json();
        } catch (err) {
          return jsonResponse({
            approved: false,
            message: 'Failed to verify with Flutterwave: ' + err.message,
          }, 502);
        }

        const isSuccess =
          flwData &&
          flwData.status === 'success' &&
          flwData.data &&
          (flwData.data.status === 'successful' || flwData.data.charge_response_code === '00') &&
          flwData.data.amount >= 1500 &&
          flwData.data.currency === 'NGN';

        if (!isSuccess) {
          return jsonResponse({
            approved: false,
            message: 'Payment not approved by Flutterwave. Try again or contact support.',
          }, 400);
        }

        const confirmedTxRef = flwData.data.tx_ref || tx_ref || `CDSURE_${Date.now()}_${uid}`;
        const paymentId = generateId();
        const dateStr = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO payments (id, uid, amount, gateway, tx_ref, transaction_id, status, verified_at, date)
           VALUES (?, ?, 1500, 'flutterwave', ?, ?, 'approved', ?, ?)`
        )
          .bind(paymentId, uid, confirmedTxRef, String(transaction_id), dateStr, dateStr)
          .run();

        await env.DB.prepare('UPDATE users SET activation_payment_reference = ? WHERE uid = ?')
          .bind(confirmedTxRef, uid)
          .run();

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const token = generateId() + generateId();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const verId = generateId();

        await env.DB.prepare(
          `INSERT INTO email_verifications (id, uid, code, link_token, expires_at, verified)
           VALUES (?, ?, ?, ?, ?, 0)`
        )
          .bind(verId, uid, code, token, expiresAt)
          .run();

        return jsonResponse({
          approved: true,
          message: 'Payment approved by Flutterwave!',
          paymentId,
          code,
          token,
        });
      }

      // 3. POST /api/upload-proof
      if (path === '/api/upload-proof' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { proof_base64, uid } = body;

        if (!proof_base64 || !uid) {
          return jsonResponse({ error: 'proof_base64 and uid are required' }, 400);
        }

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1"
        )
          .bind(uid)
          .first();

        if (!approvedPayment) {
          return jsonResponse({ error: 'No approved payment found. Please pay first.' }, 403);
        }

        await env.DB.prepare('UPDATE payments SET proof_screenshot_url = ? WHERE id = ?')
          .bind(proof_base64, approvedPayment.id)
          .run();

        await env.DB.prepare('UPDATE users SET activation_screenshot_url = ? WHERE uid = ?')
          .bind(proof_base64, uid)
          .run();

        return jsonResponse({ success: true, message: 'Proof uploaded successfully.' });
      }

      // 4. POST /api/verify-code
      if (path === '/api/verify-code' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { uid, code, token } = body;

        if (!code && !token) {
          return jsonResponse({ error: 'code or token is required' }, 400);
        }

        const nowIso = new Date().toISOString();
        let verification = null;

        if (code) {
          verification = await env.DB.prepare(
            'SELECT * FROM email_verifications WHERE code = ? AND expires_at > ? AND verified = 0'
          )
            .bind(code.trim(), nowIso)
            .first();
        } else if (token) {
          verification = await env.DB.prepare(
            'SELECT * FROM email_verifications WHERE link_token = ? AND expires_at > ? AND verified = 0'
          )
            .bind(token.trim(), nowIso)
            .first();
        }

        if (!verification) {
          return jsonResponse({ error: 'Invalid or expired confirmation code.' }, 400);
        }

        const targetUid = verification.uid;

        const payment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1"
        )
          .bind(targetUid)
          .first();

        if (!payment) {
          return jsonResponse({ error: 'Flutterwave payment not approved.' }, 403);
        }

        await env.DB.prepare('UPDATE email_verifications SET verified = 1 WHERE id = ?')
          .bind(verification.id)
          .run();

        await env.DB.prepare("UPDATE payments SET status = 'approved' WHERE uid = ?")
          .bind(targetUid)
          .run();

        await env.DB.prepare('UPDATE users SET is_activated = 1 WHERE uid = ?')
          .bind(targetUid)
          .run();

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(targetUid)
          .first();

        // Referrer ₦200 bonus
        if (user.referred_by) {
          const existingRef = await env.DB.prepare('SELECT id FROM referrals WHERE referred_uid = ?')
            .bind(targetUid)
            .first();

          if (!existingRef) {
            const referrerUid = user.referred_by;
            const refBonusId = generateId();
            const dateStr = new Date().toISOString();

            await env.DB.prepare(
              `UPDATE users 
               SET balance = balance + 200, 
                   referral_earnings = referral_earnings + 200, 
                   total_earned = total_earned + 200 
               WHERE uid = ?`
            )
              .bind(referrerUid)
              .run();

            await env.DB.prepare(
              `INSERT INTO referrals (id, referrer_uid, referred_uid, bonus, date)
               VALUES (?, ?, ?, 200, ?)`
            )
              .bind(refBonusId, referrerUid, targetUid, dateStr)
              .run();
          }
        }

        return jsonResponse({
          success: true,
          message: 'Payment Approved - Account Activated!',
          user,
        });
      }

      // 5. GET /api/dashboard?uid=
      if (path === '/api/dashboard' && request.method === 'GET') {
        const uid = url.searchParams.get('uid');
        if (!uid) return jsonResponse({ error: 'uid is required' }, 400);

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        if (!user) return jsonResponse({ error: 'User not found' }, 404);

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified') ORDER BY date DESC LIMIT 1"
        )
          .bind(uid)
          .first();

        if (!user.is_activated || !approvedPayment) {
          return jsonResponse({
            locked: true,
            error: 'Flutterwave payment not approved. Please pay first.',
          }, 403);
        }

        const { results: referrals } = await env.DB.prepare(
          `SELECT r.id, r.bonus, r.date, u.email as referred_email, u.full_name as referred_name 
           FROM referrals r 
           LEFT JOIN users u ON r.referred_uid = u.uid 
           WHERE r.referrer_uid = ? 
           ORDER BY r.date DESC`
        )
          .bind(uid)
          .all();

        const { results: withdrawals } = await env.DB.prepare(
          'SELECT * FROM withdrawals WHERE uid = ? ORDER BY date DESC LIMIT 10'
        )
          .bind(uid)
          .all();

        const now = new Date();
        const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        const { count: completedToday } = (await env.DB.prepare(
          'SELECT COUNT(*) as count FROM completions WHERE uid = ? AND submitted_at >= ?'
        )
          .bind(uid, startOfTodayIso)
          .first()) || { count: 0 };

        return jsonResponse({
          user,
          referrals: referrals || [],
          referralCount: (referrals || []).length,
          withdrawals: withdrawals || [],
          completedToday,
        });
      }

      // 6. GET /api/tasks?uid=
      if (path === '/api/tasks' && request.method === 'GET') {
        const uid = url.searchParams.get('uid');
        if (!uid) return jsonResponse({ error: 'uid query parameter is required' }, 400);

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')"
        )
          .bind(uid)
          .first();

        if (!user || !user.is_activated || !approvedPayment) {
          return jsonResponse({ error: 'Complete Flutterwave Payment to Continue', locked: true }, 403);
        }

        const now = new Date();
        const expiresAtDate = getTodayMidnightUtc();
        const expiresAtIso = expiresAtDate.toISOString();

        const oneHourBeforeExpiry = new Date(expiresAtDate.getTime() - 60 * 60 * 1000);
        const isExpired = now.getTime() >= oneHourBeforeExpiry.getTime();
        const minutesLeft = Math.max(0, Math.floor((expiresAtDate.getTime() - now.getTime()) / 60000));

        const { results: tasks } = await env.DB.prepare(
          'SELECT id, title, reward, link, instructions FROM tasks'
        ).all();

        const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        const { results: completions } = await env.DB.prepare(
          'SELECT task_id, status, proof_screenshot_url FROM completions WHERE uid = ? AND submitted_at >= ?'
        )
          .bind(uid, startOfTodayIso)
          .all();

        const completionMap = new Map();
        (completions || []).forEach((c) => completionMap.set(c.task_id, c));

        const tasksWithStatus = (tasks || []).map((t) => {
          const comp = completionMap.get(t.id);
          return {
            ...t,
            expires_at: expiresAtIso,
            completed: !!comp,
            completionStatus: comp ? comp.status : null,
            proof_screenshot_url: comp ? comp.proof_screenshot_url : null,
          };
        });

        return jsonResponse({
          tasks: tasksWithStatus,
          expiresAt: expiresAtIso,
          serverTime: now.toISOString(),
          isExpired,
          minutesLeft,
        });
      }

      // 7. POST /api/complete-task
      if (path === '/api/complete-task' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { uid, taskId, proofScreenshotUrl } = body;

        if (!uid || !taskId) return jsonResponse({ error: 'uid and taskId are required' }, 400);
        if (!proofScreenshotUrl) return jsonResponse({ error: 'Screenshot proof is required' }, 400);

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')"
        )
          .bind(uid)
          .first();

        if (!user || !user.is_activated || !approvedPayment) {
          return jsonResponse({ error: 'Account not activated or payment not approved.' }, 403);
        }

        const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
          .bind(taskId)
          .first();

        if (!task) return jsonResponse({ error: 'Task not found' }, 404);

        const now = new Date();
        const expiresAtDate = getTodayMidnightUtc();
        const oneHourBeforeExpiry = new Date(expiresAtDate.getTime() - 60 * 60 * 1000);

        if (now.getTime() >= oneHourBeforeExpiry.getTime()) {
          return jsonResponse(
            { error: 'Task Expired - Come back tomorrow! Submissions close 1 hour before midnight UTC.' },
            400
          );
        }

        const startOfTodayIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
        const existing = await env.DB.prepare(
          'SELECT id FROM completions WHERE uid = ? AND task_id = ? AND submitted_at >= ?'
        )
          .bind(uid, taskId, startOfTodayIso)
          .first();

        if (existing) {
          return jsonResponse(
            { error: 'You have already submitted this task today. Resets daily at midnight UTC.' },
            400
          );
        }

        const completionId = generateId();
        const submittedAt = now.toISOString();

        await env.DB.prepare(
          `INSERT INTO completions (id, uid, task_id, proof_screenshot_url, status, submitted_at, reviewed_at)
           VALUES (?, ?, ?, ?, 'approved', ?, ?)`
        )
          .bind(completionId, uid, taskId, proofScreenshotUrl, submittedAt, submittedAt)
          .run();

        await env.DB.prepare(
          `UPDATE users 
           SET balance = balance + ?, 
               total_earned = total_earned + ? 
           WHERE uid = ?`
        )
          .bind(task.reward, task.reward, uid)
          .run();

        const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        return jsonResponse({
          success: true,
          message: `Proof accepted! ₦${task.reward} added to your balance.`,
          reward: task.reward,
          balance: updatedUser.balance,
          total_earned: updatedUser.total_earned,
        });
      }

      // 8. POST /api/withdraw
      if (path === '/api/withdraw' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { uid, amount, bankName = 'Commercial Bank', accountNumber = '', accountName = '' } = body;
        const numAmount = parseInt(amount, 10);

        if (!uid || isNaN(numAmount) || numAmount < 500) {
          return jsonResponse({ error: 'Minimum withdrawal is ₦500' }, 400);
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        const approvedPayment = await env.DB.prepare(
          "SELECT * FROM payments WHERE uid = ? AND status IN ('approved', 'verified')"
        )
          .bind(uid)
          .first();

        if (!user || !user.is_activated || !approvedPayment) {
          return jsonResponse({ error: 'Only members with approved payment can withdraw.' }, 403);
        }

        if (user.balance < numAmount) {
          return jsonResponse({ error: 'Insufficient balance' }, 400);
        }

        const withdrawalId = generateId();
        const dateStr = new Date().toISOString();

        await env.DB.prepare('UPDATE users SET balance = balance - ? WHERE uid = ?')
          .bind(numAmount, uid)
          .run();

        await env.DB.prepare(
          `INSERT INTO withdrawals (id, uid, amount, status, bank_name, account_number, account_name, date)
           VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`
        )
          .bind(withdrawalId, uid, numAmount, bankName, accountNumber, accountName, dateStr)
          .run();

        const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?')
          .bind(uid)
          .first();

        return jsonResponse({
          success: true,
          message: `Withdrawal request of ₦${numAmount.toLocaleString()} submitted! Processing within 24 hours.`,
          balance: updatedUser.balance,
          withdrawal: {
            id: withdrawalId,
            amount: numAmount,
            status: 'pending',
            date: dateStr,
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
          },
        });
      }

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }

      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
    }
  },
};
