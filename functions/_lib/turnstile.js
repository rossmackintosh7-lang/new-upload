export async function verifyTurnstile(env, token, remoteIp = '') {
  if (!env.TURNSTILE_SECRET_KEY) return false;

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token || '');
  if (remoteIp) form.append('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form
  });

  const data = await response.json();
  return Boolean(data.success);
}
