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

function makeCounter($wrap) {
  let sequence = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].join('\n');
  $wrap.classList.add('counter');
  $wrap.innerHTML = `
    <div class='digit'><div class='sequence'>${sequence}</div></div>
    <div class='digit'><div class='sequence'>${sequence}</div></div>
  `;
  const seqs = $wrap.querySelectorAll('.sequence');
  const tens = seqs[0], ones = seqs[1];

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

function runCounterTo42($wrap, step = 6, tickMs = 700) {
  const c = makeCounter($wrap);
  const values = [];
  for (let i = 42; i >= 0; i -= step) values.push(i);

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

function runPageTransition() {
  const pageTransition = document.querySelector('.page-transition');
  const blocks = pageTransition.querySelectorAll('.block');
  const preloaderStars = pageTransition.querySelectorAll('.preload .stars li');
  const counterNode = document.getElementById('a');
  const topLine = pageTransition.querySelector('.line.top');
  const bottomLine = pageTransition.querySelector('.line.bottom');

  gsap.set(blocks, { bottom: '100%' });
  gsap.set(preloaderStars, { autoAlpha: 0, y: -15 });

  const showOverlay = showSection(pageTransition, { duration: 0.2 });

  const slideDown = gsap.timeline({ paused: true })
    .to(blocks, {
      bottom: '0%',
      duration: 0.5,
      ease: 'power2.in',
      stagger: 0.15
    });

  const loading = gsap.timeline({ paused: true, repeat: 2 })
    .to(preloaderStars, {
      autoAlpha: 1, y: 0, duration: 0.35, ease: 'power1.out', stagger: 0.08
    })
    .to(preloaderStars, {
      autoAlpha: 0, y: 35, duration: 0.35, ease: 'power1.in', stagger: 0.06
    }, '+=0.1');

  const lines = gsap.timeline({ paused: true })
    .to(topLine, {
      width: '100%',
      duration: 5,
      ease: 'power2.inOut'
    }).to(bottomLine, {
      width: '100%',
      duration: 5,
      ease: 'power2.inOut'
    }, '<');

  const slideUp = gsap.timeline({ paused: true })
    .to(blocks, {
      bottom: '100%',
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.12
    });

  const flow = (async () => {
    await showOverlay;

    await new Promise(res => {
      slideDown.eventCallback('onComplete', res);
      slideDown.play(0);
    });

    const preloadPromise = new Promise(res => {
      loading.eventCallback('onComplete', res);
      loading.play(0);
    });

    const linesPromise = new Promise(res => {
      lines.eventCallback('onComplete', res);
      lines.play(0);
    });

    const counterPromise = runCounterTo42(counterNode, /*step*/6, /*tick*/700);

    await Promise.all([preloadPromise, counterPromise]);

    await new Promise(res => {
      slideUp.eventCallback('onComplete', res);
      slideUp.play(0);
    });

    await hideSection(pageTransition, { duration: 0.2 });
  })();

  return flow;
}

async function initFlow() {
  const form = document.querySelector('.hero .hero__form form');
  const hero = document.querySelector('.hero');
  const finish = document.querySelector('.finish');

  gsap.set(hero, { autoAlpha: 1, display: 'block' });
  gsap.set(finish, { autoAlpha: 0, display: 'none' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const overlayShown = (async () => { await runPageTransition(); })();
    await tweenTo(hero, { autoAlpha: 0, duration: 0.15, ease: 'power2.in' });
    hero.style.display = 'none';

    await overlayShown;

    finish.style.display = 'block';
    await tweenFromTo(
      finish,
      { autoAlpha: 0, scale: 0.98 },
      { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
    );
  });
}

window.addEventListener("load", function () {

  initFlow()

  // mask for phone

  document.querySelectorAll('input[type="tel"]').forEach(function (input) {
    let keyCode;

    function mask(event) {
      if (event.keyCode) keyCode = event.keyCode;
      let pos = this.selectionStart;
      if (pos < 3) event.preventDefault();

      let matrix = "+7 (___) ___ ____",
        i = 0,
        def = matrix.replace(/\D/g, ""),
        val = this.value.replace(/\D/g, ""),
        new_value = matrix.replace(/[_\d]/g, function (a) {
          return i < val.length ? val.charAt(i++) || def.charAt(i) : a;
        });

      i = new_value.indexOf("_");
      if (i !== -1) {
        if (i < 5) i = 3;
        new_value = new_value.slice(0, i);
      }

      let reg = matrix
        .substring(0, this.value.length)
        .replace(/_+/g, function (a) {
          return "\\d{1," + a.length + "}";
        })
        .replace(/[+()]/g, "\\$&");

      reg = new RegExp("^" + reg + "$");

      if (
        !reg.test(this.value) ||
        this.value.length < 5 ||
        (keyCode > 47 && keyCode < 58)
      ) {
        this.value = new_value;
      }

      if (event.type === "blur" && this.value.length < 5) {
        this.value = "";
      }
    }

    input.addEventListener("input", mask, false);
    input.addEventListener("focus", mask, false);
    input.addEventListener("blur", mask, false);
    input.addEventListener("keydown", mask, false);
  });

});
