// ══════════════════════════════════════════════════════════════════════════════
// D' Econo-Space — Virtual Assistant Chatbot Widget
// ══════════════════════════════════════════════════════════════════════════════

(function () {
  if (document.getElementById('des-chatbot-root')) return;

  // ── 1. Inject Styles ────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #des-chatbot-root {
      position: fixed;
      bottom: 84px;
      right: 24px;
      z-index: 99999;
      font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
    }
    .des-chat-fab {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: #BF9B30;
      color: #FFFFFF;
      border: none;
      box-shadow: 0 4px 18px rgba(45,48,47,0.28);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
      outline: none;
    }
    .des-chat-fab:hover {
      transform: scale(1.08);
      background: #D4B54A;
      box-shadow: 0 6px 24px rgba(45,48,47,0.35);
    }
    .des-chat-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 14px;
      height: 14px;
      background: #27ae60;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
    }
    .des-chat-window {
      position: fixed;
      bottom: 86px;
      right: 20px;
      width: 360px;
      max-width: calc(100vw - 36px);
      height: 520px;
      max-height: calc(100vh - 110px);
      background: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.22);
      border: 1px solid #C4BDB5;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: desChatFadeIn .25s ease-out;
      z-index: 100000;
    }
    @keyframes desChatFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .des-chat-header {
      background: #2D302F;
      color: #FFFFFF;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #BF9B30;
    }
    .des-chat-header-title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .des-chat-header-sub {
      font-size: 11px;
      color: #D7D0C7;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .des-chat-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2ecc71;
      display: inline-block;
    }
    .des-chat-close {
      background: transparent;
      border: none;
      color: #D7D0C7;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      border-radius: 4px;
    }
    .des-chat-close:hover { color: #FFFFFF; }
    .des-chat-body {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      background: #F5F3F0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .des-msg {
      max-width: 85%;
      padding: 9px 13px;
      border-radius: 12px;
      word-wrap: break-word;
    }
    .des-msg-bot {
      background: #FFFFFF;
      color: #2D302F;
      align-self: flex-start;
      border: 1px solid #E2DCD5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      border-bottom-left-radius: 2px;
    }
    .des-msg-user {
      background: #2D302F;
      color: #FFFFFF;
      align-self: flex-end;
      border-bottom-right-radius: 2px;
    }
    .des-chat-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .des-chat-pill {
      background: #FFFFFF;
      border: 1px solid #BF9B30;
      color: #7A5938;
      font-size: 11.5px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 16px;
      cursor: pointer;
      transition: all .15s ease;
      text-align: left;
    }
    .des-chat-pill:hover {
      background: #BF9B30;
      color: #FFFFFF;
    }
    .des-chat-footer {
      padding: 10px 12px;
      background: #FFFFFF;
      border-top: 1px solid #E2DCD5;
      display: flex;
      gap: 8px;
    }
    .des-chat-input {
      flex: 1;
      padding: 9px 12px;
      border: 1px solid #C4BDB5;
      border-radius: 20px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }
    .des-chat-input:focus { border-color: #BF9B30; }
    .des-chat-send {
      background: #BF9B30;
      color: #FFFFFF;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s ease;
    }
    .des-chat-send:hover { background: #7A5938; }
    .des-chat-link {
      display: inline-block;
      margin-top: 6px;
      padding: 5px 12px;
      background: #BF9B30;
      color: #FFFFFF !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .des-chat-link:hover { background: #7A5938; }
  `;
  document.head.appendChild(style);

  // ── 2. Create Widget Markup ────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'des-chatbot-root';
  root.innerHTML = `
    <button id="des-chat-trigger" class="des-chat-fab" title="Chat with Assistant" aria-label="Open chat assistant">
      💬
      <span class="des-chat-badge"></span>
    </button>
    <div id="des-chat-box" class="des-chat-window" style="display:none;">
      <div class="des-chat-header">
        <div>
          <div class="des-chat-header-title">🏠 D' Econo-Space</div>
          <div class="des-chat-header-sub"><span class="des-chat-status-dot"></span> Virtual Assistant · Online</div>
        </div>
        <button id="des-chat-close-btn" class="des-chat-close" aria-label="Close chat">×</button>
      </div>
      <div id="des-chat-messages" class="des-chat-body">
        <div class="des-msg des-msg-bot">
          👋 <strong>Hi there! Welcome to D' Econo-Space!</strong><br>
          I can help you with room rates, availability, 24-hour hold rules, and bookings. What would you like to know?
        </div>
        <div class="des-chat-pills" id="des-quick-pills">
          <button class="des-chat-pill" data-topic="rates">🛏️ Rooms & Rates</button>
          <button class="des-chat-pill" data-topic="availability">📅 Check Availability</button>
          <button class="des-chat-pill" data-topic="times">⏰ Check-in / Out Times</button>
          <button class="des-chat-pill" data-topic="hold">⏳ 24-Hour Hold Policy</button>
          <button class="des-chat-pill" data-topic="payment">💳 Payment Methods</button>
          <button class="des-chat-pill" data-topic="location">📍 Location & Landmark</button>
          <button class="des-chat-pill" data-topic="staff">💬 Talk to Staff</button>
        </div>
      </div>
      <div class="des-chat-footer">
        <input type="text" id="des-chat-text" class="des-chat-input" placeholder="Type a question..." />
        <button id="des-chat-send-btn" class="des-chat-send" title="Send">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ── 3. Knowledge Base Answers ──────────────────────────────────────────────
  const RESPONSES = {
    rates: `<strong>Our Accommodation Rates:</strong><br>
      • <strong>Room D1:</strong> Common AC, sleeps up to 4 guests — starts at <strong>₱750/night</strong>.<br>
      • <strong>Room D2:</strong> Fan-cooled, sleeps up to 4 guests — starts at <strong>₱550/night</strong>.<br>
      • <strong>D' Whole Space:</strong> Exclusive AC space, sleeps up to 8 guests — starts at <strong>₱1,700/night</strong>.<br><br>
      <a href="booking.html" class="des-chat-link">Book a Room Now →</a>`,

    availability: `You can check live room availability and real-time open dates anytime on our calendar:<br><br>
      <a href="availability.html" class="des-chat-link">Open Availability Calendar →</a>`,

    times: `<strong>Standard Arrival & Departure Times:</strong><br>
      • <strong>Check-in (ETA):</strong> 2:00 PM<br>
      • <strong>Check-out (ETD):</strong> 11:00 AM<br><br>
      <em>Note: One booking night runs from 2:00 PM to 11:00 AM the next day. If arriving early morning (e.g. 5:00 AM), that still counts as the night before.</em>`,

    hold: `⏳ <strong>24-Hour Reservation Hold Policy:</strong><br>
      When you submit a booking request, your room is held for <strong>24 hours only</strong>.<br><br>
      Once payment is not settled within 24 hours, the reservation is automatically released for other guests.`,

    payment: `💳 <strong>Payment Options:</strong><br>
      We accept payments via:<br>
      • <strong>GCash</strong><br>
      • <strong>Maya</strong><br>
      • <strong>Bank / InstaPay</strong><br><br>
      After paying, please send your screenshot to our Facebook Messenger inbox or Group Chat to secure your keyholder PIN.`,

    location: `📍 <strong>Our Location:</strong><br>
      Basak Agus Rd, Gisi, Lapu-Lapu, 6015 Cebu.<br>
      <strong>Landmarks:</strong> Next to Mariel Carinderia (Google: Junrey's Store) and Triad Carwash.<br><br>
      <a href="https://maps.app.goo.gl/KgXawL22XTxx7zybA" target="_blank" class="des-chat-link">Open in Google Maps ↗</a>`,

    staff: `Need help or have a special request? Reach our friendly staff directly:<br>
      • 📞 0917.678.4871 &nbsp;|&nbsp; 0926.149.9002<br>
      • ✉️ d.econospace.cebu@gmail.com<br><br>
      <a href="https://m.me/d.econo.space.agus" target="_blank" class="des-chat-link">Chat on Messenger ↗</a>`,

    volunteer: `We offer special rates for JW and A2/A19 volunteers! Simply select the volunteer option on our booking form and enter this week's song number to unlock your discounted rate.<br><br>
      <a href="booking.html" class="des-chat-link">Go to Booking Form →</a>`
  };

  function matchQuery(q) {
    const text = q.toLowerCase();
    if (text.includes('rate') || text.includes('price') || text.includes('cost') || text.includes('magkano') || text.includes('room') || text.includes('how much')) return RESPONSES.rates;
    if (text.includes('time') || text.includes('eta') || text.includes('etd') || text.includes('checkin') || text.includes('check-in') || text.includes('checkout') || text.includes('check-out')) return RESPONSES.times;
    if (text.includes('hold') || text.includes('24') || text.includes('expire') || text.includes('release') || text.includes('reserve')) return RESPONSES.hold;
    if (text.includes('pay') || text.includes('gcash') || text.includes('maya') || text.includes('bank') || text.includes('bayad')) return RESPONSES.payment;
    if (text.includes('avail') || text.includes('date') || text.includes('calendar') || text.includes('open') || text.includes('free')) return RESPONSES.availability;
    if (text.includes('location') || text.includes('where') || text.includes('address') || text.includes('saan') || text.includes('map')) return RESPONSES.location;
    if (text.includes('volunteer') || text.includes('jw') || text.includes('song') || text.includes('a2') || text.includes('discount')) return RESPONSES.volunteer;
    if (text.includes('staff') || text.includes('human') || text.includes('contact') || text.includes('call') || text.includes('phone') || text.includes('number')) return RESPONSES.staff;

    return `I can help you with room rates, availability, check-in times (2 PM / 11 AM), 24-hr payment holds, and location. Or message our team directly:<br><br>
      <a href="https://m.me/d.econo.space.agus" target="_blank" class="des-chat-link">Open Messenger Chat ↗</a>`;
  }

  // ── 4. Interaction Handlers ────────────────────────────────────────────────
  const triggerBtn  = document.getElementById('des-chat-trigger');
  const chatBox     = document.getElementById('des-chat-box');
  const closeBtn    = document.getElementById('des-chat-close-btn');
  const sendBtn     = document.getElementById('des-chat-send-btn');
  const inputEl     = document.getElementById('des-chat-text');
  const messagesBox = document.getElementById('des-chat-messages');

  function openChat() {
    chatBox.style.display = 'flex';
    triggerBtn.style.display = 'none';
    inputEl.focus();
  }

  function closeChat() {
    chatBox.style.display = 'none';
    triggerBtn.style.display = 'flex';
  }

  triggerBtn.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);

  function appendMessage(html, isUser) {
    const msg = document.createElement('div');
    msg.className = isUser ? 'des-msg des-msg-user' : 'des-msg des-msg-bot';
    msg.innerHTML = html;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function handleSend() {
    const val = inputEl.value.trim();
    if (!val) return;
    appendMessage(val, true);
    inputEl.value = '';

    setTimeout(() => {
      const reply = matchQuery(val);
      appendMessage(reply, false);
    }, 350);
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // Topic pill clicks
  document.getElementById('des-quick-pills')?.addEventListener('click', (e) => {
    const pill = e.target.closest('.des-chat-pill');
    if (!pill) return;
    const topic = pill.getAttribute('data-topic');
    if (RESPONSES[topic]) {
      appendMessage(pill.textContent, true);
      setTimeout(() => {
        appendMessage(RESPONSES[topic], false);
      }, 300);
    }
  });

})();
