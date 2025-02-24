export const onRequestPost = async context => {
  try {
    return await handleRequest(context);
  } catch (err) {
    return new Response('Something went wrong', { status: 500 });
  }
};

const sanitizeInput = input => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '\n': '<br>',
  };

  return String(input).replace(/[&<>"'\n]/g, m => map[m]);
};

const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' },
  });
};

const handleRequest = async ({ request, env }) => {
  let formData = await request.formData();
  let sanitizedData = new FormData();

  for (let [key, value] of formData.entries()) {
    sanitizedData.append(key, sanitizeInput(value));
  }

  let name = sanitizedData.get('name');
  let email = sanitizedData.get('email');
  let subject = sanitizedData.get('subject');
  let message = sanitizedData.get('message');
  let token = sanitizedData.get('cf-turnstile-response');
  let ip = request.headers.get('CF-Connecting-IP');

  if (!name || !email || !subject || !message) {
    return jsonResponse({ message: 'Missing required fields' }, 400);
  }

  const isTokenValid = await validateToken(env, token, ip);
  if (!isTokenValid) {
    return jsonResponse({ message: 'Invalid token' }, 403);
  }

  const isEmailSent = await sendEmailWithSendGrid(env, name, email, subject, message);
  if (!isEmailSent) {
    // return jsonResponse({ message: 'Error sending message' }, 500);
    return jsonResponse({ message: `FROM: ${env.MAILGUN_FROM}` }, 500);
  }

  return jsonResponse({ message: 'Message sent successfully' }, 200);
};

const sendRequest = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
};

const validateToken = async (env, token, ip) => {
  const formData = new FormData();
  formData.append('secret', env.TURNSTILE_SECRET_KEY);
  formData.append('response', token);
  formData.append('remoteip', ip);

  const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  const options = {
    method: 'POST',
    body: formData,
  };

  const response = await sendRequest(url, options);
  return response.success;
};

const formatEmailBody = (name, email, subject, message) => {
  return `
    <b>${name}</b><br>
    ${email}<br><br>
    <b>${subject}</b><br><br>
    ${message}<br><br>
    ---<br>
    <i>This message was sent from your website's contact form</i>
  `;
};

const sendEmailWithMailgun = async (env, name, email, subject, message) => {
  const formData = new FormData();
  formData.append('from', env.MAILGUN_FROM);
  formData.append('h:Sender', env.MAILGUN_FROM);
  formData.append('to', env.MAILGUN_TO);
  formData.append('h:Reply-To', name + ' <' + email + '>');
  formData.append('subject', name + ' - ' + subject);
  formData.append('html', formatEmailBody(name, email, subject, message));

  const url = env.MAILGUN_API_URI;
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
    },
    body: formData,
  };

  const response = await sendRequest(url, options);
  return response.message === 'Queued. Thank you.';
};

const sendEmailWithSendGrid = async (env, name, email, subject, message) => {
  const url = env.SENDGRID_API_URI;
  const body = JSON.stringify({
    personalizations: [
      {
        to: [{ email: env.SENDGRID_TO }],
        subject: `${name} - ${subject}`,
      },
    ],
    from: { email: env.SENDGRID_FROM },
    reply_to: { email: email, name: name },
    content: [
      {
        type: 'text/html',
        value: formatEmailBody(name, email, subject, message),
      },
    ],
  });

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body,
  };

  const response = await sendRequest(url, options);
  return response.message === 'Queued. Thank you.';
};
