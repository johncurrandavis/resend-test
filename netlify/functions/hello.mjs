
// the Netlify CLI automatically loads the local .env variables
// when running functions:serve, we don't need dotenv explicitly in the function
// (you could also remove the now-unnecessary dependency
// from the project root: npm uninstall dotenv)
// import "dotenv/config";

import { Resend } from "resend";


export default async (request) => {

  // only accept POST requests
  if (request.method !== "POST") { return jsonResponse({ error: "Method not allowed." }, 405, { Allow: "POST" }); }

  // reject request bodies larger than 10 KB
  const MAX_BODY_SIZE = 10 * 1024;
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_SIZE) { return jsonResponse({ error: "Request body is too large." }, 413); }

  // read the submitted JSON
  let body;

  try {

    // read the raw body first so we can measure its actual size
    const rawBody = await request.text();

    // measure the body in bytes (not characters)
    const bodySize = new TextEncoder().encode(rawBody).byteLength;

    if (bodySize > MAX_BODY_SIZE) { return jsonResponse({ error: "Request body is too large." }, 413); }

    // parse JSON only after checking the size
    body = JSON.parse(rawBody);

  } catch (error) {

    // keep the size-limit response separate from JSON errors
    if (error instanceof SyntaxError) { return jsonResponse({ error: "Invalid JSON." }, 400); }

    return jsonResponse({ error: "Unable to read request body." }, 400);

  }

  // extract the submitted fields
  const { name, email, message, website } = body ?? {};

  // reject submissions caught by the honeypot
  if (typeof website === "string" && website.trim() !== "") { return jsonResponse({ error: "Invalid form submission." }, 400); }

  // check that the required fields are strings
  if ( typeof name !== "string" || typeof email !== "string" || typeof message !== "string" ) { return jsonResponse({ error: "Please provide your name, email address and message." }, 400); }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();

  // check that no required field is empty
  if (!cleanName || !cleanEmail || !cleanMessage) { return jsonResponse({ error: "All fields are required." }, 400); }

  // limit the length of submitted values
  if ( cleanName.length > 100 || cleanEmail.length > 254 || cleanMessage.length > 5000 ) { return jsonResponse({ error: "One or more fields exceed the allowed length." }, 400); }

  // basic email-format check
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(cleanEmail)) { return jsonResponse({ error: "Please enter a valid email address." }, 400); }

  // check that the Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured.");

    return jsonResponse(
      { error: "Email service is not configured." },
      500
    );
  }

  // create a Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);

  // send the email
  try {
    const { data, error } = await resend.emails.send({

      from: "onboarding@resend.dev",
      to: "peopleswebsites@gmail.com",
      replyTo: cleanEmail,
      subject: "Website contact form message",
      text: `You have received a new contact form message.

      Name: ${cleanName}
      Email: ${cleanEmail}

      Message:
      ${cleanMessage}`

    });

    // handle an error returned by Resend
    if (error) {
      console.error("Resend error:", error);
      return jsonResponse({ error: "The email provider could not send the email." }, 502);
    }

    // report successful delivery request
    return jsonResponse({
      message: "Email sent successfully!",
      id: data.id
    });

  } catch (error) {
    console.error("Email sending failed:", error);
    return jsonResponse({ error: "An unexpected error occurred while sending the email." }, 500);
  }

};


// helper to return consistent JSON responses
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}
