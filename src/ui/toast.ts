/** Aviso temporário na tela (reutilizado por ferramentas que precisam de feedback). */
export function showToast(message: string, durationMs = 3500): void {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'padding:10px 18px;border-radius:8px;background:rgba(10,30,55,.92);' +
    'color:#eaf2fb;font:14px sans-serif;z-index:10000;pointer-events:none;' +
    'box-shadow:0 4px 12px rgba(0,0,0,.35);';
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), durationMs);
}
