import { NextResponse } from 'next/server'

const widgetScript = `
(function () {
  var currentScript = document.currentScript;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function scriptOrigin() {
    if (!currentScript || !currentScript.src) return 'https://nadamas.app';
    return new URL(currentScript.src).origin;
  }

  function findTargets() {
    var previous = currentScript && currentScript.previousElementSibling;
    if (previous && previous.dataset && previous.dataset.cliente) return [previous];

    var byId = document.getElementById('agenda-widget');
    if (byId && byId.dataset && byId.dataset.cliente) return [byId];

    return Array.prototype.slice.call(document.querySelectorAll('[data-nadamas-widget][data-cliente], [data-cliente].nadamas-widget'));
  }

  function mount(target, origin) {
    if (!target || target.dataset.nadamasMounted === 'true') return;

    var cliente = target.dataset.cliente;
    if (!cliente) return;

    target.dataset.nadamasMounted = 'true';
    var frameUrl = new URL('/embed/coach/' + encodeURIComponent(cliente), origin);

    ['color', 'lang', 'theme'].forEach(function (key) {
      var value = target.dataset[key];
      if (value) frameUrl.searchParams.set(key, value);
    });

    var iframe = document.createElement('iframe');
    iframe.src = frameUrl.toString();
    iframe.title = target.dataset.title || 'Horarios de nadamas.app';
    iframe.loading = 'lazy';
    iframe.style.width = '100%';
    iframe.style.minHeight = (target.dataset.height || '620') + 'px';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.style.background = 'transparent';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');

    target.innerHTML = '';
    target.appendChild(iframe);

    window.addEventListener('message', function (event) {
      if (event.origin !== origin) return;
      var data = event.data || {};
      if (data.type !== 'nadamas:widget:resize' || typeof data.height !== 'number') return;
      iframe.style.height = Math.max(data.height, 320) + 'px';
    });
  }

  ready(function () {
    var origin = scriptOrigin();
    findTargets().forEach(function (target) {
      mount(target, origin);
    });
  });
})();
`

export async function GET() {
  return new NextResponse(widgetScript.trim(), {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
}
