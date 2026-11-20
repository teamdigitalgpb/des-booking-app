// D' Econo-Space — "Talk to us" Messenger bubble
// Replaces the old keyword chatbot. Every tap opens the DES Facebook Page in
// Messenger, so guests reach a real person.

(function () {
  if (document.getElementById('des-messenger-bubble')) return;

  const MESSENGER = (typeof CONFIG !== 'undefined' && CONFIG.MESSENGER_URL) || 'https://m.me/890165717502663';

  const style = document.createElement('style');
  style.textContent = `
    #des-messenger-bubble {
      position: fixed; right: 20px; bottom: 20px; z-index: 9999;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 18px 10px 10px; border-radius: 999px;
      background: #2D302F; color: #FFFFFF; text-decoration: none;
      font: 600 14px/1.2 Montserrat, system-ui, -apple-system, sans-serif;
      box-shadow: 0 8px 28px rgba(45,48,47,.28);
      border: 1px solid rgba(191,155,48,.55);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    #des-messenger-bubble:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(45,48,47,.34); }
    #des-messenger-bubble svg { width: 36px; height: 36px; flex: none; }
    #des-messenger-bubble small { display: block; font-weight: 500; font-size: 11.5px; color: #D7D0C7; margin-top: 2px; }
    @media (max-width: 480px) {
      #des-messenger-bubble { right: 14px; bottom: 14px; padding: 8px; }
      #des-messenger-bubble .label { display: none; }
    }
  `;
  document.head.appendChild(style);

  const a = document.createElement('a');
  a.id = 'des-messenger-bubble';
  a.href = MESSENGER;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', "Talk to a real person at D' Econo-Space on Messenger");
  a.innerHTML = `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#BF9B30"/>
      <path d="M24 10c-7.9 0-14 5.8-14 13.3 0 3.9 1.7 7.4 4.4 9.8v4.9l4.3-2.4c1.6.4 3.4.7 5.3.7 7.9 0 14-5.8 14-13.1S31.9 10 24 10z" fill="#FFFFFF"/>
      <path d="M15.8 27.7l4.6-7.3 3.7 2.8 5.3-2.8-4.6 7.3-3.7-2.8z" fill="#BF9B30"/>
    </svg>
    <span class="label">Talk to us<small>A real person replies on Messenger</small></span>`;
  document.body.appendChild(a);

  // Remove the old floating Messenger icon if a page still has one
  document.querySelectorAll('.messenger-fab').forEach(el => el.remove());
})();
