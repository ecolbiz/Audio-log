function stripJsonComments(str) {
  return str
    .replace(/\/\/[^\n]*/g, '')
    .replace(/#[^\n]*/g, '')
    .replace(/,(\s*[}\]])/g, '$1');
}

function interpolate(value, context) {
  if (typeof value === 'string') {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, k) => context[k.trim()] ?? '');
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, context));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, context)]));
  }
  return value;
}

async function dispatch(webhook, transcription, audio) {
  const {
    url,
    method = 'POST',
    authType = 'none',
    authToken = '',
    authUser = '',
    authPass = '',
    authHeader = 'X-API-Key',
    authKey = '',
    extraHeaders = '{}',
    bodyTemplate = '{}',
  } = webhook;

  // Flatten fields: Dropdown values are stored as IDs already (strings)
  const context = {
    ...(transcription.fields || {}),
    __audioId__: audio.id,
    __recordedAt__: audio.createdAt instanceof Date ? audio.createdAt.toISOString() : String(audio.createdAt),
    __recordedBy__: audio.user?.name ?? '',
    __auditedAt__: transcription.auditedAt instanceof Date ? transcription.auditedAt.toISOString() : String(transcription.auditedAt ?? ''),
    __auditedBy__: transcription.auditedBy?.name ?? '',
  };

  // Interpolate as raw string first so unquoted {{TOKEN}} can produce numbers/booleans
  const interpolatedTemplate = stripJsonComments(bodyTemplate)
    .replace(/\{\{([^}]+)\}\}/g, (match, k) => {
      const val = context[k.trim()];
      return val !== undefined && val !== '' ? String(val) : match;
    });

  let body = {};
  try { body = JSON.parse(interpolatedTemplate); } catch { body = {}; }

  let parsedExtra = {};
  try { parsedExtra = JSON.parse(stripJsonComments(extraHeaders)); } catch { parsedExtra = {}; }

  const headers = { 'Content-Type': 'application/json', ...parsedExtra };
  if (authType === 'bearer') headers['Authorization'] = `Bearer ${authToken}`;
  if (authType === 'basic') headers['Authorization'] = `Basic ${Buffer.from(`${authUser}:${authPass}`).toString('base64')}`;
  if (authType === 'apikey') headers[authHeader || 'X-API-Key'] = authKey;

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();
  return { ok: response.ok, status: response.status, body: responseBody };
}

module.exports = { dispatch };
