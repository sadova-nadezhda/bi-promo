// ===== GSAP helpers =====
const tweenTo = (target, vars) => new Promise(res => {
  gsap.to(target, { ...vars, onComplete: res });
});
const tweenFromTo = (target, fromVars, toVars) => new Promise(res => {
  gsap.fromTo(target, fromVars, { ...toVars, onComplete: res });
});

async function showSection(el, dur = 0.35) {
  el.style.display = 'block';
  el.style.pointerEvents = 'auto';
  await tweenTo(el, { autoAlpha: 1, duration: dur, ease: 'power2.out' });
}
async function hideSection(el, dur = 0.25, displayNone = true) {
  await tweenTo(el, { autoAlpha: 0, duration: dur, ease: 'power2.in' });
  el.style.pointerEvents = 'none';
  if (displayNone) el.style.display = 'none';
}

// ===== Counter (две колонны 0-9) =====
function makeCounter($wrap) {
  const sequence = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].join('\n');
  $wrap.classList.add('counter');
  $wrap.innerHTML = `
    <div class='digit'><div class='sequence'>${sequence}</div></div>
    <div class='digit'><div class='sequence'>${sequence}</div></div>
  `;
  const [tens, ones] = $wrap.querySelectorAll('.sequence');

  function countTo(n) {
    const tensVal = Math.floor(n / 10);
    const onesVal = n % 10;
    if (tensVal > 0) {
      tens.classList.remove('is-hidden');
      tens.style.webkitTransform = `translate3d(0, ${-(9 - tensVal) * 10}%, 0)`;
    } else {
      tens.classList.add('is-hidden');
    }
    ones.style.webkitTransform = `translate3d(0, ${-(9 - onesVal) * 10}%, 0)`;
  }
  return { countTo };
}
function runCounterRange($wrap, from = 42, to = 0, step = 6, tickMs = 700) {
  const c = makeCounter($wrap);
  const values = [];
  if (from >= to) { for (let v = from; v >= to; v -= step) values.push(v); }
  else { for (let v = from; v <= to; v += step) values.push(v); }

  return new Promise(resolve => {
    let i = 0;
    c.countTo(values[i]);
    const iv = setInterval(() => {
      i++;
      if (i < values.length) {
        c.countTo(values[i]);
      } else {
        clearInterval(iv);
        resolve();
      }
    }, tickMs);
  });
}

// ===== SITE PRELOADER (только звёзды) =====
const SITE_PRELOADER_KEY = 'site_preloader_last';
const SHOW_ONCE_EVERY_HOURS = 12; // 0 — показывать всегда

function shouldShowSitePreloader() {
  try {
    const last = localStorage.getItem(SITE_PRELOADER_KEY);
    if (!last) return true;
    const diffH = (Date.now() - Number(last)) / 36e5;
    return diffH >= SHOW_ONCE_EVERY_HOURS;
  } catch { return true; }
}
function markSitePreloaderShown() {
  try { localStorage.setItem(SITE_PRELOADER_KEY, Date.now()); } catch { }
}

/** Показать прелоудер и дождаться скрытия */
async function runSitePreloaderIfNeeded() {
  const node = document.querySelector('.site-preloader');
  if (!node) return; // нет разметки — ничего не делаем

  if (!shouldShowSitePreloader()) {
    node.remove(); // не показываем — убираем из DOM
    return;
  }

  document.documentElement.classList.add('is-preloading');
  document.body.classList.add('is-preloading');

  const stars = node.querySelectorAll('.site-preloader__stars li');
  gsap.set(stars, { autoAlpha: 0, y: -10, scale: 0.9 });
  gsap.set(node, { autoAlpha: 1, display: 'flex' });

  const starsP = new Promise(res => {
    gsap.timeline({ repeat: 2, onComplete: res })
      .to(stars, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power1.out', stagger: 0.1 })
      .to(stars, { autoAlpha: 0, y: 20, scale: 0.95, duration: 0.35, ease: 'power1.in', stagger: 0.08 }, '+=0.15');
  });
  const watchdog = new Promise(res => setTimeout(res, 5000));

  await Promise.race([starsP, watchdog]);

  await new Promise(res => gsap.to(node, { autoAlpha: 0, duration: 0.25, ease: 'power2.in', onComplete: res }));
  node.style.display = 'none';

  document.documentElement.classList.remove('is-preloading');
  document.body.classList.remove('is-preloading');
  markSitePreloaderShown();
}

// ===== PAGE TRANSITION (hero -> page-transition -> finish) =====
function runPageTransition() {
  const pageTransition = document.querySelector('.page-transition');
  const blocks = pageTransition.querySelectorAll('.block');
  const preloaderStars = pageTransition.querySelectorAll('.preload .stars li');
  const counterNode = document.getElementById('a');
  const topLine = pageTransition.querySelector('.line.top');
  const bottomLine = pageTransition.querySelector('.line.bottom');

  gsap.set(blocks, { bottom: '100%' });
  gsap.set(preloaderStars, { autoAlpha: 0, y: -15 });
  gsap.set([topLine, bottomLine], { width: 0 });

  const showOverlay = showSection(pageTransition, 0.2);

  const slideDown = gsap.timeline({ paused: true })
    .to(blocks, { bottom: '0%', duration: 0.5, ease: 'power2.in', stagger: 0.15 });

  const loading = gsap.timeline({ paused: true, repeat: 2 })
    .to(preloaderStars, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power1.out', stagger: 0.08 })
    .to(preloaderStars, { autoAlpha: 0, y: 35, duration: 0.35, ease: 'power1.in', stagger: 0.06 }, '+=0.1');

  const lines = gsap.timeline({ paused: true })
    .to(topLine, { width: '100%', duration: 5, ease: 'power2.inOut' })
    .to(bottomLine, { width: '100%', duration: 5, ease: 'power2.inOut' }, '<');

  const slideUp = gsap.timeline({ paused: true })
    .to(blocks, { bottom: '100%', duration: 0.5, ease: 'power2.out', stagger: 0.12 });

  const flow = (async () => {
    await showOverlay;

    await new Promise(res => { slideDown.eventCallback('onComplete', res); slideDown.play(0); });

    const preloadPromise = new Promise(res => { loading.eventCallback('onComplete', res); loading.play(0); });
    const linesPromise = new Promise(res => { lines.eventCallback('onComplete', res); lines.play(0); });
    const counterPromise = runCounterRange(counterNode, 42, 0, 6, 700);

    // ЖДЁМ ВСЁ, включая линии (исправлено)
    await Promise.all([preloadPromise, linesPromise, counterPromise]);

    await new Promise(res => { slideUp.eventCallback('onComplete', res); slideUp.play(0); });

    await hideSection(pageTransition, 0.2);
  })();

  return flow;
}

// ===== Init (после DOM) =====
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Сначала — общий прелоудер (если нужен)
  await runSitePreloaderIfNeeded();

  // 2) Затем — инициализация основного сценария
  const form = document.querySelector('.hero .hero__form form');
  const hero = document.querySelector('.hero');
  const finish = document.querySelector('.finish');

  gsap.set(hero, { autoAlpha: 1, display: 'block' });
  gsap.set(finish, { autoAlpha: 0, display: 'none' });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // мгновенно гасим hero
      await tweenTo(hero, { autoAlpha: 0, duration: 0.15, ease: 'power2.in' });
      hero.style.display = 'none';

      // запускаем переход
      await runPageTransition();

      // показываем finish
      finish.style.display = 'block';
      await tweenFromTo(finish, { autoAlpha: 0, scale: 0.98 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
    });
  }

  // 3) Маска телефона
  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    let keyCode;
    function mask(event) {
      if (event.keyCode) keyCode = event.keyCode;
      const pos = this.selectionStart;
      if (pos < 3) event.preventDefault();
      const matrix = "+7 (___) ___ ____";
      let i = 0;
      const def = matrix.replace(/\D/g, "");
      const val = this.value.replace(/\D/g, "");
      let new_value = matrix.replace(/[_\d]/g, a => (i < val.length ? val.charAt(i++) || def.charAt(i) : a));
      i = new_value.indexOf("_");
      if (i !== -1) { if (i < 5) i = 3; new_value = new_value.slice(0, i); }
      let reg = matrix.substring(0, this.value.length)
        .replace(/_+/g, a => "\\d{1," + a.length + "}")
        .replace(/[+()]/g, "\\$&");
      reg = new RegExp("^" + reg + "$");
      if (!reg.test(this.value) || this.value.length < 5 || (keyCode > 47 && keyCode < 58)) {
        this.value = new_value;
      }
      if (event.type === "blur" && this.value.length < 5) this.value = "";
    }
    input.addEventListener("input", mask, false);
    input.addEventListener("focus", mask, false);
    input.addEventListener("blur", mask, false);
    input.addEventListener("keydown", mask, false);
  });
});
