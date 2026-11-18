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

  function Seq(section){
    const key = section.dataset.seq;
    const cv = section.querySelector('.cv');
    if(!cv) return;
    const ctx = cv.getContext('2d');
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
    }, {rootMargin:'150% 0px'}).observe(section);

    function cover(im){
      const m = Math.max(W/im.width, H/im.height);
      const sw = im.width*m, sh = im.height*m;
      return {x:(W-sw)/2, y:(H-sh)/2, sw, sh};
    }

    function draw(p){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      const f = clamp(p)*(st.N-1), i0 = Math.floor(f), a = f-i0;
      const A = st.get(i0); if(!A) return;
      const t = cover(A);
      ctx.drawImage(A,t.x,t.y,t.sw,t.sh);
      const B = a>.02 ? st.get(i0+1) : null;
      if(B && B!==A){ ctx.globalAlpha=a; ctx.drawImage(B,t.x,t.y,t.sw,t.sh); ctx.globalAlpha=1; }
    }

    if(reduce){
      section.classList.add('reduce-still');
      st.load();
      st.onprog.push(() => draw(1));
      return;
    }

    const pinLen = mobile ? '220%' : '280%';
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: pinLen,
      pin: true,
      scrub: 0.65,
      snap: {snapTo: [0,1], duration:0.35, delay:0.04, ease:'power1.inOut'},
      onUpdate: self => { progress = self.progress; if(vis) draw(progress); },
      onRefresh: () => { resize(); draw(progress); }
    });
    st.load();
    requestAnimationFrame(() => draw(0));
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

  if(!reduce){
    gsap.utils.toArray('.tcard, .card, .blog-list a, .event').forEach(el => {
      gsap.from(el, {
        y: 28, opacity: 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: {trigger: el, start: 'top 88%'}
      });
    });
  }
})();
