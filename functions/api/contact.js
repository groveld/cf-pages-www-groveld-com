// SENDGRID_API_KEY
// SENDGRID_API_URI
// SENDGRID_FROM_EMAIL
// SENDGRID_FROM_NAME
// SENDGRID_TO_EMAIL
// SENDGRID_TO_NAME

// MAILGUN_API_KEY
// MAILGUN_API_URI
// MAILGUN_FROM_EMAIL
// MAILGUN_FROM_NAME
// MAILGUN_TO_EMAIL
// MAILGUN_TO_NAME

// Usage: https://yourdomain.com/api/contact

export const onRequestPost = async context => {
  try {
    return await handleRequest(context);
  } catch (err) {
    return jsonResponse('Something went wrong', 500);
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

const jsonResponse = (message, status = 200, data = {}) => {
  const responseBody = { status, message };
  if (Object.keys(data).length > 0) {
    responseBody.data = data;
  }
  return new Response(JSON.stringify(responseBody), {
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
    return jsonResponse('Missing required fields', 400, {
      formData: Object.fromEntries(sanitizedData.entries()),
    });
  }

  const isTokenValid = await validateToken(env, token, ip);
  if (!isTokenValid) {
    return jsonResponse('Invalid token', 403, {
      formData: Object.fromEntries(sanitizedData.entries()),
    });
  }

  const emailResponse = await sendEmailWithSendGrid(env, name, email, subject, message);
  return jsonResponse('Debug response', 200, {
    formData: Object.fromEntries(sanitizedData.entries()),
    emailResponse: emailResponse,
  });

  // if (!emailResponse.success) {
  //   return jsonResponse('Error sending message', 500, {
  //     formData: Object.fromEntries(sanitizedData.entries()),
  //     emailResponse: emailResponse,
  //   });
  // }

  // return jsonResponse('Message sent successfully', 200, {
  //   formData: Object.fromEntries(sanitizedData.entries()),
  //   emailResponse: emailResponse,
  // });
};

const sendRequest = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json();
  return { success: response.ok, status: response.status, data: data };
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
  return response.data.success;
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
  formData.append('from', env.MAILGUN_FROM_NAME + ' <' + env.MAILGUN_FROM_EMAIL + '>');
  formData.append('h:Sender', env.MAILGUN_FROM_NAME + ' <' + env.MAILGUN_FROM_EMAIL + '>');
  formData.append('to', env.MAILGUN_TO_NAME + ' <' + env.MAILGUN_TO_EMAIL + '>');
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
  return response;
  // Example response from Mailgun:
  // "response": {
  //   "success": true,
  //   "status": 200,
  //   "data": {
  //     "id": "<20250225094411.669d06094be703fc@groveld.com>",
  //     "message": "Queued. Thank you."
  //   }
  // }
};

const sendEmailWithSendGrid = async (env, name, email, subject, message) => {
  const url = env.SENDGRID_API_URI;
  const body = JSON.stringify({
    personalizations: [
      {
        to: [{ email: env.SENDGRID_TO_EMAIL, name: env.SENDGRID_TO_NAME }],
        subject: `${name} - ${subject}`,
      },
    ],
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
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
  return response;
  // Example response from SendGrid:
};
