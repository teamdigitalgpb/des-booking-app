(function () {
  const ua = navigator.userAgent || '';
  const isIAB = /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Instagram|Messenger/i.test(ua);
  if (!isIAB) return;

  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const steps = isIOS
    ? 'Tap <strong style="color:#f5c518;">···</strong> at the top-right corner, then choose <strong style="color:#f5c518;">Open in Browser</strong>.'
    : isAndroid
    ? 'Tap <strong style="color:#f5c518;">⋮</strong> at the top-right corner, then choose <strong style="color:#f5c518;">Open in Chrome</strong>.'
    : 'Copy the link and paste it into <strong style="color:#f5c518;">Chrome</strong> or <strong style="color:#f5c518;">Safari</strong>.';

  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:999999',
    'background:rgba(15,12,8,.96)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'padding:2rem', 'text-align:center',
    'font-family:Montserrat,sans-serif',
  ].join(';');

  el.innerHTML = `
    <div style="font-size:3rem;margin-bottom:1rem;">🌐</div>
    <h2 style="color:#fff;font-size:1.25rem;font-weight:700;margin:0 0 .75rem;">Open in your browser</h2>
    <p style="color:rgba(255,255,255,.8);font-size:.95rem;line-height:1.8;margin:0 0 1.5rem;max-width:320px;">
      ${steps}
    </p>
    <p style="color:rgba(255,255,255,.45);font-size:.78rem;max-width:300px;line-height:1.6;">
      Payment and booking features require a real browser — Safari or Chrome works best.
    </p>
  `;

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(el);
  });
})();
