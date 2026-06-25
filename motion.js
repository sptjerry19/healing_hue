/**
 * Premium motion layer — GSAP, Three.js aurora, particles, tilt, magnetic CTAs.
 * Honors prefers-reduced-motion. Business logic lives in index.html inline script.
 */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─── Three.js Aurora Background ─── */
  function initWebGL() {
    const canvas = document.getElementById("webgl-bg");
    if (!canvas || typeof THREE === "undefined") return null;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        varying vec2 vUv;

        vec3 aurora(vec2 uv, float t) {
          vec2 p = uv - 0.5;
          p.x *= uResolution.x / uResolution.y;
          float wave1 = sin(p.x * 3.0 + t * 0.35) * 0.5 + 0.5;
          float wave2 = sin(p.y * 2.5 - t * 0.28 + p.x) * 0.5 + 0.5;
          float blend = smoothstep(0.2, 0.9, wave1 * wave2);
          vec3 c1 = vec3(0.05, 0.08, 0.18);
          vec3 c2 = vec3(0.12, 0.35, 0.95);
          vec3 c3 = vec3(0.55, 0.22, 0.95);
          vec3 c4 = vec3(0.08, 0.75, 0.85);
          vec3 col = mix(c1, c2, blend);
          col = mix(col, c3, smoothstep(0.4, 1.0, wave2) * 0.45);
          col = mix(col, c4, smoothstep(0.55, 1.0, wave1) * 0.35);
          float vignette = 1.0 - length(p) * 0.85;
          return col * max(vignette, 0.0);
        }

        void main() {
          vec2 uv = vUv;
          vec2 mouseOff = (uMouse - 0.5) * 0.08;
          vec3 color = aurora(uv + mouseOff, uTime);
          float grain = fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
          color += (grain - 0.5) * 0.025;
          gl_FragColor = vec4(color, 0.92);
        }
      `,
      transparent: true,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let rafId = 0;
    const start = performance.now();

    function onMove(e) {
      targetX = e.clientX / window.innerWidth;
      targetY = 1 - e.clientY / window.innerHeight;
    }

    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      material.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight,
      );
    }

    function tick() {
      const t = (performance.now() - start) * 0.001;
      mouseX += (targetX - mouseX) * 0.06;
      mouseY += (targetY - mouseY) * 0.06;
      material.uniforms.uTime.value = t;
      material.uniforms.uMouse.value.set(mouseX, mouseY);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }

    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      tick();
    } else {
      material.uniforms.uTime.value = 1;
      renderer.render(scene, camera);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }

  /* ─── Canvas Particles ─── */
  function initParticles() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let rafId = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function spawn() {
      const count = window.innerWidth < 768 ? 48 : 90;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.45 + 0.15,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const force = (140 - dist) / 140;
          p.vx -= (dx / dist) * force * 0.02;
          p.vy -= (dy / dist) * force * 0.02;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 200, 255, ${p.a})`;
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < 100) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.12 * (1 - d / 100)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    }

    resize();
    spawn();
    if (!reduceMotion) {
      window.addEventListener("resize", () => {
        resize();
        spawn();
      });
      window.addEventListener("pointermove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });
      draw();
    }

    return () => cancelAnimationFrame(rafId);
  }

  /* ─── Cursor Glow ─── */
  function initCursorGlow() {
    const glow = document.getElementById("cursor-glow");
    if (!glow || reduceMotion) return;

    let x = 0;
    let y = 0;
    let cx = 0;
    let cy = 0;

    window.addEventListener("pointermove", (e) => {
      x = e.clientX;
      y = e.clientY;
    });

    function loop() {
      cx += (x - cx) * 0.12;
      cy += (y - cy) * 0.12;
      glow.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`;
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ─── 3D Tilt Cards ─── */
  function bindTiltCard(card) {
    if (reduceMotion || card.dataset.tiltBound) return;
    card.dataset.tiltBound = "1";

    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(8px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform =
        "perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0)";
    });
  }

  function initTiltCards() {
    document.querySelectorAll(".tilt-card").forEach(bindTiltCard);
  }

  window.reinitTiltCards = initTiltCards;

  /* ─── Magnetic Buttons ─── */
  function initMagnetic() {
    if (reduceMotion) return;

    document.querySelectorAll(".magnetic-btn").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.22}px, ${y * 0.22}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ─── GSAP Motion ─── */
  function initGSAP() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
      return;

    gsap.registerPlugin(ScrollTrigger);

    const header = document.getElementById("header");
    if (header) {
      ScrollTrigger.create({
        start: 80,
        onEnter: () => header.classList.add("scrolled"),
        onLeaveBack: () => header.classList.remove("scrolled"),
      });
    }

    if (reduceMotion) {
      gsap.set(".reveal, .reveal-child", { opacity: 1, y: 0 });
      return;
    }

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from(".hero-orb", {
        scale: 0,
        opacity: 0,
        duration: 1.4,
        stagger: 0.15,
        ease: "power2.out",
      })
      .from(
        ".hero-badge",
        { y: 20, opacity: 0, duration: 0.7 },
        "-=1",
      )
      .from(
        ".hero-title .line",
        { y: 80, opacity: 0, rotateX: 40, duration: 1, stagger: 0.12 },
        "-=0.5",
      )
      .from(".hero-desc", { y: 24, opacity: 0, duration: 0.8 }, "-=0.5")
      .from(
        ".hero-actions .btn-primary, .hero-actions .btn-secondary",
        { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 },
        "-=0.4",
      )
      .from(
        ".hero-stat-float",
        { y: 40, opacity: 0, duration: 0.8, stagger: 0.1 },
        "-=0.3",
      );

    gsap.to(".hero-orb--1", {
      y: -30,
      x: 20,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to(".hero-orb--2", {
      y: 25,
      x: -15,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to(".hero-orb--3", {
      y: -18,
      duration: 3.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

  gsap.utils.toArray(".reveal").forEach((section) => {
      const children = section.querySelectorAll(".reveal-child");
      if (children.length) {
        gsap.from(children, {
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
          y: 48,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
        });
      } else {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        });
      }
    });

    gsap.utils.toArray(".parallax-layer").forEach((el) => {
      const speed = parseFloat(el.dataset.speed || "0.3");
      gsap.to(el, {
        y: () => speed * 120,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    });

    gsap.utils.toArray(".homestay-card, .food-card, .member-card").forEach(
      (card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            toggleActions: "play none none reverse",
          },
          y: 36,
          opacity: 0,
          duration: 0.7,
          delay: (i % 3) * 0.05,
          ease: "power2.out",
        });
      },
    );

    const budgetTotal = document.getElementById("budgetTotal");
    if (budgetTotal) {
      ScrollTrigger.create({
        trigger: "#budget",
        start: "top 70%",
        once: true,
        onEnter: () => pulseBudget(budgetTotal),
      });
    }

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dayId = btn.getAttribute("data-day");
        const content = document.getElementById(dayId);
        if (!content) return;
        gsap.from(content.querySelectorAll(".timeline-item"), {
          y: 28,
          opacity: 0,
          duration: 0.55,
          stagger: 0.06,
          ease: "power2.out",
        });
      });
    });
  }

  function pulseBudget(el) {
    if (typeof gsap === "undefined") return;
    gsap.fromTo(
      el,
      { scale: 0.92, opacity: 0.5 },
      { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" },
    );
  }

  window.animateBudgetTotal = function (el) {
    if (!el || reduceMotion || typeof gsap === "undefined") return;
    gsap.fromTo(
      el,
      { scale: 1.04, filter: "brightness(1.4)" },
      {
        scale: 1,
        filter: "brightness(1)",
        duration: 0.5,
        ease: "power2.out",
      },
    );
  };

  function init() {
    initWebGL();
    initParticles();
    initCursorGlow();
    initTiltCards();
    initMagnetic();
    initGSAP();
    document.body.classList.add("motion-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
