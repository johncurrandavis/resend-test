
import './style.css';


document.querySelector('#app').innerHTML = `

  <main class="contact-container">

    <h1>Get in touch</h1>
    <p>Have a question? Send us a message using the form below.</p>

    <form id="contactForm">

      <div class="form-group">
        <label for="name">Your name</label>
        <input type="text" id="name" name="name" autocomplete="name" required>
      </div>

      <div class="form-group">
        <label for="email">Your email address</label>
        <input type="email" id="email" name="email" autocomplete="email" required>
      </div>

      <div class="form-group">
        <label for="message">Your message</label>
        <textarea id="message" name="message" rows="6" required ></textarea>
      </div>

      <!-- honeypot: intended to catch basic spambots -->
      <div class="honeypot" aria-hidden="true">
        <label for="website">Leave this field empty</label>
        <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
      </div>

      <button type="submit">Send message</button>

      <p id="status" role="status" aria-live="polite"></p>

    </form>

  </main>

`;


const contactForm = document.querySelector('#contactForm');
const status = document.querySelector('#status');
const submitButton = contactForm.querySelector('button[type="submit"]');

contactForm.addEventListener('submit', async (event) => {

  event.preventDefault();  // stop the browser from navigating away or reloading


  // collect the form fields

  const formData = new FormData(contactForm);

  const contact = {
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    message: formData.get('message').trim(),
    website: formData.get('website').trim()
  };

  status.textContent = 'Sending your message...';
  submitButton.disabled = true;

  try {

    // send a POST request to Express
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/send-email`,  // the frontend API address from .env
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)  // convert the values to JSON for the backend
      }
    );

const result = await response.json();

    if (!response.ok) { throw new Error(result.error || 'Failed to send message.'); }

    status.textContent = 'Thank you! Your message has been sent.';
    contactForm.reset();

  } catch (error) {
    console.error('Contact form error:', error);
    status.textContent = 'Sorry, we could not send your message. Please try again.';

  } finally {
    submitButton.disabled = false;
  }
});
