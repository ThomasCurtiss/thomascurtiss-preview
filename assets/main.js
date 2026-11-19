(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMob = () => innerWidth < 820;
  const clamp = (x,a=0,b=1) => Math.min(b, Math.max(a, x));

  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if(!reduce){
    try{
      lenis = new Lenis({lerp:0.08, smoothWheel:true, syncTouch:false, wheelMultiplier:0.85, touchMultiplier:1});
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => { lenis.raf(t*1000); });
      gsap.ticker.lagSmoothing(0);
    }catch(e){ lenis = null; }
  }

  const STORE = {};
  function frameStore(key, mobile, N){
    const id = key + (mobile ? 'm' : 'd');
    if(STORE[id]) return STORE[id];
    const st = STORE[id] = {key, mobile, N, imgs:new Array(N), loaded:0, failed:0, started:false, onprog:[]};
    st.path = i => `assets/seq/${key}/${mobile?'m':'d'}/f${String(i+1).padStart(3,'0')}.jpg`;
    st.load = () => {
      if(st.started) return;
      st.started = true;
      const order = [...Array(N).keys()];
      order.sort((a,b) => (a%6===0?-1:0)-(b%6===0?-1:0) || a-b);
      order.forEach(i => {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { st.imgs[i]=im; st.loaded++; st.onprog.forEach(f=>f(st)); };
        im.onerror = () => { st.failed++; };
        im.src = st.path(i);
      });
    };
    st.get = i => {
      i = clamp(Math.round(i), 0, N-1);
      for(let d=0; d<N; d++){
        if(st.imgs[i-d]) return st.imgs[i-d];
        if(st.imgs[i+d]) return st.imgs[i+d];
      }
      return null;
    };
    return st;
  }

  function applyLayers(section, p){
    const glow = section.querySelector('.sun-glow');
    const flare = section.querySelector('.flare');
    const keys = section.querySelector('.keys-par');
    const copy = section.querySelector('.copy');
    const cue = section.querySelector('.scroll-cue');
    if(glow){
      glow.style.transform = `translate3d(${-p*48}px, ${p*36}px, 0) scale(${1+p*0.28})`;
      glow.style.opacity = String(0.8 + p*0.2);
    }
    if(flare){
      flare.style.transform = `translate3d(${p*70}px, ${-p*24}px, 0) rotate(${p*12}deg)`;
      flare.style.opacity = String(0.32 + p*0.28);
    }
    if(keys){
      keys.style.transform = `translate3d(${p*90}px, ${-p*140}px, 0) scale(${1+p*0.18})`;
      keys.style.opacity = String(Math.max(0, 0.85*(1-p*1.05)));
    }
    if(copy){
      copy.style.transform = `translate3d(0, ${-p*160}px, 0)`;
      copy.style.opacity = String(p < 0.52 ? 1 : Math.max(0, 1-(p-0.52)/0.32));
    }
    if(cue){
      cue.style.opacity = String(Math.max(0, 1-p*3.2));
    }
  }

  function Seq(section){
    const key = section.dataset.seq;
    const cv = section.querySelector('.cv');
    if(!cv) return;
    const ctx = cv.getContext('2d', {alpha:false});
    const loadBar = section.querySelector('.loader i');
    const loader = section.querySelector('.loader');
    const mobile = isMob();
    const N = +(mobile ? section.dataset.nm : section.dataset.n);
    const st = frameStore(key, mobile, N);
    st.onprog.push(s => {
      if(loadBar) loadBar.style.width = (s.loaded/N*100)+'%';
      if(s.loaded>=N && loader) loader.classList.add('done');
    });
    let W=0,H=0,dpr=1,progress=0,vis=false;

    function resize(){
      dpr = Math.min(devicePixelRatio||1, 2);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W*dpr);
      cv.height = Math.round(H*dpr);
    }
    addEventListener('resize', resize);
    resize();

    new IntersectionObserver(es => {
      es.forEach(e => { vis = e.isIntersecting; if(vis) st.load(); });
    }, {rootMargin:'160% 0px'}).observe(section);

    function cover(im){
      const m = Math.max(W/im.width, H/im.height);
      const sw = im.width*m, sh = im.height*m;
      return {x:(W-sw)/2, y:(H-sh)/2, sw, sh};
    }

    function draw(p){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle = '#1B2A3A';
      ctx.fillRect(0,0,W,H);
      const f = clamp(p)*(st.N-1), i0 = Math.floor(f), a = f-i0;
      const A = st.get(i0); if(!A) return;
      const t = cover(A);
      ctx.drawImage(A,t.x,t.y,t.sw,t.sh);
      const B = a>.015 ? st.get(i0+1) : null;
      if(B && B!==A){
        const t2 = cover(B);
        ctx.globalAlpha=a;
        ctx.drawImage(B,t2.x,t2.y,t2.sw,t2.sh);
        ctx.globalAlpha=1;
      }
    }

    if(reduce){
      section.classList.add('reduce-still');
      st.load();
      st.onprog.push(() => { draw(1); applyLayers(section, 0); });
      return;
    }

    const long = section.dataset.pin === 'long';
    const pinLen = long
      ? (mobile ? '+=300%' : '+=420%')
      : (mobile ? '+=230%' : '+=320%');
    const headerH = () => (document.querySelector('.site-header')?.offsetHeight || 72);

    ScrollTrigger.create({
      trigger: section,
      start: () => `top ${headerH()}px`,
      end: pinLen,
      pin: true,
      scrub: 0.9,
      anticipatePin: 1,
      onUpdate: self => {
        progress = self.progress;
        if(vis) draw(progress);
        applyLayers(section, progress);
      },
      onRefresh: () => { resize(); draw(progress); applyLayers(section, progress); }
    });
    st.load();
    requestAnimationFrame(() => { draw(0); applyLayers(section, 0); });
  }

  document.querySelectorAll('section[data-seq]').forEach(Seq);

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav.primary');
  if(toggle && nav){
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    }));
  }

  document.querySelectorAll('form.demo').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      form.style.display = 'none';
      const ok = form.parentElement.querySelector('.form-ok');
      if(ok) ok.style.display = 'block';
    });
  });

  if(reduce) return;

  /* Hero headline reveal */
  const hero = document.querySelector('.hero-scene');
  if(hero){
    const words = hero.querySelectorAll('.word');
    const rest = hero.querySelectorAll('.eyebrow, .lead, .cta-row');
    gsap.set(words, {yPercent:110, opacity:0});
    gsap.set(rest, {y:22, opacity:0});
    const tl = gsap.timeline({delay:0.12});
    tl.to(words, {yPercent:0, opacity:1, duration:0.95, ease:'power3.out', stagger:0.08});
    tl.to(rest, {y:0, opacity:1, duration:0.7, ease:'power2.out', stagger:0.12}, '-=0.45');
    const cue = hero.querySelector('.scroll-cue');
    if(cue) tl.fromTo(cue, {opacity:0}, {opacity:1, duration:0.55}, '-=0.15');
  }

  /* Palette sweeps and gold rules */
  gsap.utils.toArray('.palette-sweep').forEach(bar => {
    const sw = bar.querySelectorAll('.sw');
    gsap.set(sw, {scaleX:0});
    gsap.to(sw, {
      scaleX:1, duration:0.8, ease:'power2.out', stagger:0.1,
      scrollTrigger:{trigger:bar, start:'top 92%'}
    });
  });
  gsap.utils.toArray('.gold-rule').forEach(rule => {
    gsap.to(rule, {
      scaleX:1, duration:0.9, ease:'power2.out',
      scrollTrigger:{trigger:rule, start:'top 88%'}
    });
  });

  /* Mission typography */
  const missionP = document.querySelector('.mission p:not(.eyebrow)');
  if(missionP){
    gsap.from(missionP, {
      y:36, opacity:0, duration:1, ease:'power3.out',
      scrollTrigger:{trigger:missionP, start:'top 86%'}
    });
  }

  /* Section heading fades */
  gsap.utils.toArray('.band > .wrap > h2, .band > .wrap > .eyebrow, .band > .wrap > .intro').forEach(el => {
    gsap.from(el, {
      y:22, opacity:0, duration:0.7, ease:'power3.out',
      scrollTrigger:{trigger:el, start:'top 90%'}
    });
  });

  /* Service / blog / event cards */
  gsap.utils.toArray('.cards-3 .card, .blog-list a, .event, .partner-row img').forEach(el => {
    gsap.from(el, {
      y:28, opacity:0, duration:0.65, ease:'power3.out',
      scrollTrigger:{trigger:el, start:'top 90%'}
    });
  });

  /* Team cards: stagger, headshot mask, line draw, bio fade, social pop */
  const grid = document.querySelector('.team-grid');
  if(grid){
    const cards = gsap.utils.toArray('.tcard');
    cards.forEach(card => {
      const imgWrap = card.querySelector('.ph');
      const img = card.querySelector('.ph img');
      const bodyBits = card.querySelectorAll('h3, .role, .dre');
      const bio = card.querySelector('.bio');
      const icons = card.querySelectorAll('.socials a');
      gsap.set(card, {y:48, opacity:0});
      gsap.set(imgWrap, {clipPath:'inset(100% 0 0 0)'});
      if(img) gsap.set(img, {scale:1.16});
      gsap.set(bodyBits, {y:14, opacity:0});
      if(bio) gsap.set(bio, {y:16, opacity:0});
      if(icons.length) gsap.set(icons, {scale:0, opacity:0});
    });

    ScrollTrigger.create({
      trigger: grid,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        cards.forEach((card, i) => {
          const delay = i * 0.12;
          const imgWrap = card.querySelector('.ph');
          const img = card.querySelector('.ph img');
          const bodyBits = card.querySelectorAll('h3, .role, .dre');
          const bio = card.querySelector('.bio');
          const icons = card.querySelectorAll('.socials a');
          const line = {v:0};
          const tl = gsap.timeline({delay});
          tl.to(card, {y:0, opacity:1, duration:0.7, ease:'power3.out'}, 0);
          tl.to(imgWrap, {clipPath:'inset(0% 0 0 0)', duration:0.9, ease:'power3.out'}, 0.08);
          if(img) tl.to(img, {scale:1, duration:1.15, ease:'power2.out'}, 0.08);
          tl.to(line, {
            v:1, duration:0.7, ease:'power2.out',
            onUpdate: () => { imgWrap.style.setProperty('--draw', line.v); }
          }, 0.35);
          tl.add(() => { imgWrap.classList.add('drawn'); }, 0.35);
          tl.to(bodyBits, {y:0, opacity:1, duration:0.5, ease:'power2.out', stagger:0.06}, 0.4);
          if(bio) tl.to(bio, {y:0, opacity:1, duration:0.55, ease:'power2.out'}, 0.55);
          if(icons.length) tl.to(icons, {scale:1, opacity:1, duration:0.4, ease:'back.out(1.8)', stagger:0.06}, 0.7);
        });
      }
    });
  }

  /* Draw gold line via class once revealed */
  const styleFix = document.createElement('style');
  styleFix.textContent = '.tcard .ph.drawn::after{transform:scaleX(1);transition:transform .7s ease}';
  document.head.appendChild(styleFix);

  /* 1,000+ counter already stated in Thomas's bio */
  const counter = document.querySelector('.count[data-to]');
  if(counter){
    const end = +counter.dataset.to;
    const obj = {n:0};
    ScrollTrigger.create({
      trigger: counter,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        counter.textContent = '0';
        gsap.to(obj, {
          n: end,
          duration: 1.7,
          ease: 'power2.out',
          onUpdate: () => { counter.textContent = Math.round(obj.n).toLocaleString('en-US'); }
        });
      }
    });
  }
})();
