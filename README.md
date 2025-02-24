# cf-pages-www-groveld-com

[Cloudflare Pages](https://cf-pages-www-groveld-com.pages.dev/)

## Overview

This project contains a Cloudflare Workers script that handles contact form submissions. It validates the form data, checks for spam using Cloudflare Turnstile, and sends emails using either Mailgun or SendGrid.

## Setup

### Prerequisites

- A Cloudflare account
- Mailgun or SendGrid account for sending emails
- Cloudflare Turnstile for spam protection

### Environment Variables

You need to set the following environment variables in your Cloudflare Workers environment:

#### For Mailgun:

- `MAILGUN_API_URI`: The Mailgun API URI (e.g., `https://api.mailgun.net/v3/yourdomain.com/messages`)
- `MAILGUN_API_KEY`: Your Mailgun API key
- `MAILGUN_FROM`: The email address to send emails from (e.g., `noreply@yourdomain.com`)
- `MAILGUN_TO`: The email address to send emails to (e.g., `contact@yourdomain.com`)

#### For SendGrid:

- `SENDGRID_API_URI`: The SendGrid API URI (e.g., `https://api.sendgrid.com/v3/mail/send`)
- `SENDGRID_API_KEY`: Your SendGrid API key
- `SENDGRID_FROM`: The email address to send emails from (e.g., `noreply@yourdomain.com`)
- `SENDGRID_TO`: The email address to send emails to (e.g., `contact@yourdomain.com`)

#### Cloudflare Turnstile:

- `TURNSTILE_SECRET_KEY`: Your Cloudflare Turnstile secret key

### Deploying the Worker

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/cf-pages-www-groveld-com.git
   cd cf-pages-www-groveld-com
   ```

### Functions

#### `onRequestPost`

Handles the POST request and processes the form data.

#### `sanitizeInput`

Sanitizes the input to prevent XSS attacks.

#### `jsonResponse`

Creates a JSON response.

#### `handleRequest`

Processes the form data, validates the Turnstile token, and sends the email.

#### `sendRequest`

Sends an HTTP request.

#### `validateToken`

Validates the Turnstile token.

#### `formatEmailBody`

Formats the email body.

#### `sendEmailWithMailgun`

Sends an email using Mailgun.

#### `sendEmailWithSendGrid`

Sends an email using SendGrid.
