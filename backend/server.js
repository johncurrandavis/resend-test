
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import validator from 'validator';
import { rateLimit } from 'express-rate-limit';


dotenv.config();

// check required configuration before starting the server
if (!process.env.RESEND_API_KEY?.trim()) {
  console.error('Startup error: RESEND_API_KEY is missing.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// allow requests from our local Vite development server
app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));

// allow Express to read JSON request bodies
// limits JSON request bodies before your route processes them
// it helps to prevent unnecessarily large requests, although it
// is not a complete defence against denial-of-service attacks
app.use(express.json({ limit: '10kb' }));

// create the Resend client using our private API key, the API key
// is read from process.env, so it isn't written into the JavaScript
const resend = new Resend(process.env.RESEND_API_KEY);

// limit how often someone can submit the contact form
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes in milliseconds
  limit: 5,                  // maximum 5 requests per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  // message returned when the limit is exceeded
  message: {
    error: 'Too many requests. Please try again in 15 minutes.'
  }
});


// a simple test route, lets us check whether the server is running
app.get('/', (req, res) => { res.json({ message: 'Our email backend is running!' }); });


app.post('/api/send-email', contactLimiter, async (req, res) => {

  try {
    const { name, email, message, website } = req.body ?? {};

    // reject submissions where the honeypot field has been filled in
    if (typeof website === 'string' && website.trim() !== '') {
      return res.status(400).json({
        error: 'Invalid form submission.'
      });
    }

    // ensure all fields are strings
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof message !== 'string'
    ) {
      return res.status(400).json({
        error: 'Please provide your name, email address and message.'
      });
    }

    // remove unnecessary whitespace from the edges
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    // check required fields
    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({
        error: 'All fields are required.'
      });
    }

    // enforce field length limits
    if (
      cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      cleanMessage.length > 5000
    ) {
      return res.status(400).json({
        error: 'One or more fields exceed the allowed length.'
      });
    }

    // validate the email address
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'Please enter a valid email address.'
      });
    }

    // send the email only after validation succeeds
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'peopleswebsites@gmail.com',
      replyTo: cleanEmail,
      subject: 'Website contact form message',
      text: [
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        '',
        'Message:',
        cleanMessage
      ].join('\n')
    });

    if (error) {
      console.error('Resend error:', error);

      return res.status(502).json({
        error: 'We could not send your message. Please try again later.'
      });
    }

    return res.json({
      message: 'Message sent successfully!',
      id: data.id
    });

  } catch (error) {
    console.error('Contact endpoint error:', error);

    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// handle requests that contain invalid or oversized JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Your request is too large. Please reduce the size and try again.'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body.'
    });
  }

  // pass any other errors to Express's default error handler
  next(err);
});

app.listen(PORT, () => { console.log(`Backend running at http://localhost:${PORT}`); });
