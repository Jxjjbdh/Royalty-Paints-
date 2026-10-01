(() => {
  "use strict";

  const CONTACT = {
    whatsapp: "2347035109011",
    phoneDisplay: "07035109011",
    email: "royaltypaintsnigerialtd@gmail.com",
    company: "Royalty Paints"
  };

  const REVIEW_STORAGE_KEY = "royaltyReviews";
  const HIDDEN_DEFAULT_PROJECTS_KEY = "royaltyHiddenDefaultProjects";
  const THEME_STORAGE_KEY = "royaltyTheme";
  const DEFAULT_REVIEWS = [
    {
      name: "Mrs. Adeola",
      service: "Satin interior finish",
      rating: 5,
      message: "Royalty Paints transformed our living room beautifully. The finish is smooth, neat and the colour still looks fresh.",
      date: "Featured"
    },
    {
      name: "Mr. Johnson",
      service: "Exterior repaint",
      rating: 5,
      message: "Good product recommendation, clean workers and timely delivery. The exterior now looks premium and well protected.",
      date: "Featured"
    },
    {
      name: "Site Manager",
      service: "Paint supply",
      rating: 4,
      message: "Reliable paint supply for our project. The buckets arrived on time and the colours matched our specification.",
      date: "Featured"
    }
  ];

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function syncViewportState() {
    const root = document.documentElement;
    const width = window.innerWidth || root.clientWidth || 0;
    const height = window.innerHeight || root.clientHeight || 0;
    root.style.setProperty("--viewport-w", `${width}px`);
    root.style.setProperty("--viewport-h", `${height}px`);
    root.classList.toggle("is-landscape", width > height);
    root.classList.toggle("is-portrait", height >= width);
  }

  let viewportTimer;
  function watchViewportState() {
    syncViewportState();
    const update = () => {
      clearTimeout(viewportTimer);
      viewportTimer = setTimeout(syncViewportState, 80);
    };
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
  }

  function setActiveNav() {
    const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const currentHash = location.hash || "";
    const links = $$(".nav-link");
    let hashMatched = false;
    links.forEach((link) => link.classList.remove("active"));
    if (currentHash) {
      links.forEach((link) => {
        const url = new URL(link.getAttribute("href") || "", window.location.href);
        const file = (url.pathname.split("/").pop() || "index.html").toLowerCase();
        if (file === currentFile && url.hash === currentHash) {
          link.classList.add("active");
          hashMatched = true;
        }
      });
    }
    if (hashMatched) return;
    links.forEach((link) => {
      const url = new URL(link.getAttribute("href") || "", window.location.href);
      const file = (url.pathname.split("/").pop() || "index.html").toLowerCase();
      if (file === currentFile && !url.hash) link.classList.add("active");
    });
  }

  const NAV_HISTORY_KEY = "royaltyLastActiveNavIndex";
  const NAV_TRANSITION_KEY = "royaltyNavTransition";

  function navStorageGet(key) {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function navStorageSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (error) {}
    try { localStorage.setItem(key, value); } catch (error) {}
  }

  function initLiquidMenuIndicator() {
    const menu = $(".site-menu");
    if (!menu) return;
    const links = [...menu.children].filter((child) => child.classList?.contains("nav-link"));
    if (!links.length) return;
    let activeLink = links.find((link) => link.classList.contains("active")) || links[0];
    let activeIndex = Math.max(0, links.indexOf(activeLink));
    let currentIndex = activeIndex;
    let moveTimer;
    const fileFromUrl = (value) => {
      try {
        const url = new URL(value, window.location.href);
        return (url.pathname.split("/").pop() || "index.html").toLowerCase();
      } catch (error) {
        return "index.html";
      }
    };
    const indexFromUrl = (value) => {
      const file = fileFromUrl(value);
      const hash = (() => {
        try { return new URL(value, window.location.href).hash; } catch (error) { return ""; }
      })();
      if (hash) {
        const hashIndex = links.findIndex((link) => {
          const url = new URL(link.getAttribute("href") || "", window.location.href);
          return (url.pathname.split("/").pop() || "index.html").toLowerCase() === file && url.hash === hash;
        });
        if (hashIndex >= 0) return hashIndex;
      }
      return links.findIndex((link) => {
        const url = new URL(link.getAttribute("href") || "", window.location.href);
        return (url.pathname.split("/").pop() || "index.html").toLowerCase() === file && !url.hash;
      });
    };
    const transition = (() => {
      try {
        const data = JSON.parse(navStorageGet(NAV_TRANSITION_KEY) || "null");
        return data && typeof data === "object" ? data : null;
      } catch (error) {
        return null;
      }
    })();
    const referrerIndex = document.referrer ? indexFromUrl(document.referrer) : -1;
    const storedIndex = Number(navStorageGet(NAV_HISTORY_KEY));
    const storedValid = Number.isFinite(storedIndex) && storedIndex >= 0 && storedIndex < links.length;
    const transitionValid = transition && Number.isFinite(transition.from) && Number.isFinite(transition.to) && transition.to === activeIndex && Date.now() - Number(transition.time || 0) < 12000;
    let previousIndex = activeIndex;
    const wasAlreadyAnimated = transitionValid && transition.preAnimated === true;
    if (!wasAlreadyAnimated && transitionValid && transition.from >= 0 && transition.from < links.length) previousIndex = transition.from;
    else if (!wasAlreadyAnimated && referrerIndex >= 0 && referrerIndex < links.length && referrerIndex !== activeIndex) previousIndex = referrerIndex;
    else if (!wasAlreadyAnimated && storedValid && storedIndex !== activeIndex) previousIndex = storedIndex;

    const indicator = document.createElement("span");
    indicator.className = "nav-liquid-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.innerHTML = '<span class="nav-liquid-shine"></span><span class="nav-liquid-underline"></span>';
    menu.prepend(indicator);

    const desktopMenu = () => window.matchMedia("(min-width: 992px)").matches;

    // --- geometry cache: measured once per layout change, never per frame ---
    let metrics = null;
    let lastKey = "";
    let frameId = 0;
    let pending = null;

    let base = null;
    const measure = () => {
      const menuRect = menu.getBoundingClientRect();
      metrics = links.map((link) => {
        const r = link.getBoundingClientRect();
        return {
          x: Math.round((r.left - menuRect.left) * 10) / 10,
          y: Math.round((r.top - menuRect.top) * 10) / 10,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10
        };
      });
      // one fixed-size box, never resized again: the pill travels and scales on
      // the compositor instead of re-laying out its width on every frame
      base = {
        w: Math.max(1, ...metrics.map((m) => m.w)),
        h: Math.max(1, ...metrics.map((m) => m.h))
      };
      indicator.style.width = `${base.w}px`;
      indicator.style.height = `${base.h}px`;
    };

    const hide = () => {
      indicator.style.opacity = "0";
      indicator.style.visibility = "hidden";
    };

    // all DOM writes happen in a single animation frame, after a single read
    const commit = () => {
      frameId = 0;
      const job = pending;
      pending = null;
      if (!job) return;
      if (!desktopMenu()) { hide(); return; }
      if (!metrics || metrics.length !== links.length) measure();
      const spot = metrics[job.index];
      if (!spot) return;
      const key = `${spot.x}|${spot.y}|${spot.w}|${spot.h}`;
      const isMove = !job.instant && job.ripple && job.index !== currentIndex && key !== lastKey;

      indicator.classList.toggle("is-instant", job.instant === true);
      if (isMove) {
        indicator.classList.add("is-moving");
        window.clearTimeout(moveTimer);
        moveTimer = window.setTimeout(() => indicator.classList.remove("is-moving"), 420);
      } else if (!job.ripple) {
        window.clearTimeout(moveTimer);
        indicator.classList.remove("is-moving");
      }

      if (key !== lastKey) {
        const sx = spot.w / base.w;
        const sy = spot.h / base.h;
        // counter-scale the corner radius and hairline so the scaled pill still
        // renders as a true pill with a 1px edge instead of a stretched oval
        const ry = spot.h / 2;
        const edge = readEdges();
        indicator.style.borderRadius = `${ry / sx}px / ${ry / sy}px`;
        indicator.style.setProperty("--pill-sx", String(sx));
        indicator.style.setProperty("--pill-sy", String(sy));
        indicator.style.transform = `translate3d(${spot.x}px, ${spot.y}px, 0) scale(${sx}, ${sy})`;
        lastKey = key;
        if (isMove && edge) jellyTo(edge, spot);
      }
      indicator.style.visibility = "visible";
      indicator.style.opacity = "1";
      currentIndex = job.index;
      if (job.instant) window.requestAnimationFrame(() => indicator.classList.remove("is-instant"));
    };

    // ---- aggressive jelly blob overslide -------------------------------
    // the leading edge of the pill races ahead and overshoots the target while
    // the trailing edge lags behind, so the blob stretches, oversleeps the mark,
    // then wobbles back and settles. Pure transform keyframes => compositor only.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const readEdges = () => {
      if (!base) return null;
      const cs = window.getComputedStyle(indicator);
      if (!cs.transform || cs.transform === "none") return null;
      try {
        const m = new DOMMatrixReadOnly(cs.transform);
        return { left: m.e, width: Math.max(1, m.a * base.w), sy: m.d || 1 };
      } catch (error) {
        return null;
      }
    };

    // easeOutBack: lands past the target then eases home
    const back = (t, strength) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const u = t - 1;
      return 1 + (strength + 1) * u * u * u + strength * u * u;
    };

    const jellyTo = (from, spot) => {
      if (reducedMotion.matches || typeof indicator.animate !== "function") return;
      const toLeft = spot.x;
      const toWidth = spot.w;
      const travel = Math.abs((toLeft + toWidth / 2) - (from.left + from.width / 2));
      if (travel < 2) return;

      const goingRight = toLeft >= from.left;
      const leadFrom = goingRight ? from.left + from.width : from.left;
      const leadTo = goingRight ? toLeft + toWidth : toLeft;
      const trailFrom = goingRight ? from.left : from.left + from.width;
      const trailTo = goingRight ? toLeft : toLeft + toWidth;

      // longer trips punch harder, but the smear and the overslide are capped
      // so the blob never shoots past the menu or thins out into a streak
      const punch = Math.min(0.26, 0.1 + travel / 1600);
      const maxWidth = Math.min(base.w * 2.1, toWidth + Math.min(150, travel * 0.55));
      const maxOverslide = Math.min(34, 10 + travel * 0.07);
      const steps = 14;
      const frames = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const lead = back(t, 1.5 + punch * 5);
        const trail = back(Math.max(0, (t - 0.16) / 0.84), 0.9 + punch * 2);
        let a = leadFrom + (leadTo - leadFrom) * lead;
        const b = trailFrom + (trailTo - trailFrom) * trail;
        // clamp how far the leading edge may overslide past its mark
        a = goingRight ? Math.min(a, leadTo + maxOverslide) : Math.max(a, leadTo - maxOverslide);
        let left = Math.min(a, b);
        let width = Math.max(10, Math.abs(a - b));
        if (width > maxWidth) {
          // keep the leading edge honest and pull the trailing edge forward
          width = maxWidth;
          left = goingRight ? Math.max(a, b) - width : Math.min(a, b);
        }
        const sx = width / base.w;
        // stretched sideways => squashed vertically, like a blob of jelly
        const stretch = width / toWidth;
        const squash = Math.max(0.78, Math.min(1.16, 1 - (stretch - 1) * 0.42));
        const sy = (spot.h / base.h) * squash;
        const top = spot.y + (spot.h - base.h * sy) / 2;
        frames.push({
          offset: t,
          transform: `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
          easing: "linear"
        });
      }
      indicator.getAnimations().forEach((animation) => animation.cancel());
      indicator.classList.add("is-jelly");
      const run = indicator.animate(frames, { duration: 560, fill: "none", easing: "linear" });
      const done = () => indicator.classList.remove("is-jelly");
      run.addEventListener("finish", done);
      run.addEventListener("cancel", done);
    };

    const place = (link, instant = false, ripple = false) => {
      const index = links.indexOf(link);
      if (index < 0) return;
      if (!desktopMenu()) { hide(); currentIndex = index; return; }
      pending = { index, instant: instant || lastKey === "", ripple };
      if (!frameId) frameId = window.requestAnimationFrame(commit);
    };

    // re-measure after anything that can change the menu geometry, so the pill
    // never jumps to a stale position on the next click
    const remeasure = () => {
      metrics = null;
      lastKey = "";
      place(activeLink, true, false);
    };
    let settleTimer = 0;
    const remeasureSoon = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(remeasure, 90);
    };

    indicator.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") return;
      window.clearTimeout(moveTimer);
      indicator.classList.remove("is-moving");
    });

    place(activeLink, true);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(remeasure).catch(() => {});
    }
    window.addEventListener("load", remeasure, { once: true });
    window.addEventListener("pageshow", remeasure);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(remeasureSoon);
      observer.observe(menu);
      const header = document.querySelector(".site-header");
      if (header) observer.observe(header);
    }
    void previousIndex;
    void wasAlreadyAnimated;

    const updateActive = (link, index) => {
      links.forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      activeLink = link;
      activeIndex = index;
    };

    links.forEach((link, index) => {
      const saveTransition = (preAnimated = false) => {
        navStorageSet(NAV_TRANSITION_KEY, JSON.stringify({ from: activeIndex, to: index, time: Date.now(), preAnimated }));
        navStorageSet(NAV_HISTORY_KEY, String(activeIndex));
      };
      link.addEventListener("click", (event) => {
        const rawHref = link.getAttribute("href") || "";
        const url = new URL(rawHref, window.location.href);
        const isPlainInternalClick = !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (link.getAttribute("target") || "").toLowerCase() !== "_blank" && url.origin === window.location.origin;
        if (!isPlainInternalClick) {
          saveTransition(false);
          return;
        }
        const samePath = url.pathname === window.location.pathname;
        const sameTarget = samePath && (url.hash || "") === (window.location.hash || "");
        if (sameTarget) {
          event.preventDefault();
          updateActive(link, index);
          place(link, false, true);
          saveTransition(true);
          return;
        }
        if (desktopMenu()) {
          updateActive(link, index);
          place(link, false, true);
        }
        saveTransition(true);
        if (samePath && url.hash) {
          event.preventDefault();
          place(link, false, true);
          window.setTimeout(() => {
            history.pushState(null, "", url.hash);
            updateActive(link, index);
            document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
            navStorageSet(NAV_HISTORY_KEY, String(index));
            navStorageSet(NAV_TRANSITION_KEY, JSON.stringify({ from: index, to: index, time: Date.now(), preAnimated: true }));
          }, desktopMenu() ? 180 : 0);
        }
      });
    });
    menu.addEventListener("mouseleave", () => place(activeLink));
    window.addEventListener("resize", remeasureSoon, { passive: true });
    window.addEventListener("orientationchange", remeasureSoon, { passive: true });
    window.addEventListener("pagehide", () => navStorageSet(NAV_HISTORY_KEY, String(activeIndex)));
    window.setTimeout(() => {
      navStorageSet(NAV_HISTORY_KEY, String(activeIndex));
      navStorageSet(NAV_TRANSITION_KEY, JSON.stringify({ from: activeIndex, to: activeIndex, time: Date.now(), preAnimated: true }));
    }, 720);
  }

  function scrollProgress() {
    const bar = $(".scroll-progress");
    if (!bar) return;
    const update = () => {
      const doc = document.documentElement;
      const max = Math.max(doc.scrollHeight - doc.clientHeight, 1);
      const pct = (doc.scrollTop / max) * 100;
      bar.style.width = `${pct}%`;
    };
    update();
    document.addEventListener("scroll", update, { passive: true });
  }

  function revealOnScroll() {
    const items = $$(".reveal");
    if (!items.length) return;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportHeight * 0.96 && rect.bottom > 0) {
        el.classList.add("is-instant", "is-visible");
      }
    });
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -6px 0px" });
    items.forEach((el) => observer.observe(el));
  }

  function buttonRipples() {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    $$(".btn, .nav-link, .floating-whatsapp").forEach((button) => {
      button.addEventListener("click", (event) => {
        const rect = button.getBoundingClientRect();
        const bubble = document.createElement("span");
        bubble.className = "bubble-ripple";
        bubble.style.left = `${event.clientX - rect.left}px`;
        bubble.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(bubble);
        window.setTimeout(() => bubble.remove(), 620);
      }, { passive: true });
    });
  }

  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;
    const animate = (el) => {
      const target = Number(el.dataset.count || 0);
      const suffix = el.dataset.suffix || "";
      const duration = 1100;
      const startTime = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .5 });
    counters.forEach((counter) => observer.observe(counter));
  }

  function setBeforeAfter(slider, value) {
    const after = $(".ba-after", slider);
    const handle = $(".ba-handle", slider);
    const afterImg = after ? $("img", after) : null;
    const pct = Math.max(5, Math.min(95, Number(value) || 55));
    if (after) after.style.width = `${pct}%`;
    if (handle) handle.style.left = `${pct}%`;
    if (afterImg) afterImg.style.width = `${slider.clientWidth}px`;
  }

  function initBeforeAfter() {
    const sliders = $$(".ba-slider");
    sliders.forEach((slider) => {
      const range = $(".ba-range", slider);
      if (!range) return;
      setBeforeAfter(slider, range.value);
      if (slider.dataset.baReady === "yes") return;
      slider.dataset.baReady = "yes";
      range.addEventListener("input", () => setBeforeAfter(slider, range.value));
    });
    if (window.__royaltyBeforeAfterResizeReady) return;
    window.__royaltyBeforeAfterResizeReady = true;
    window.addEventListener("resize", () => {
      $$(".ba-slider").forEach((slider) => {
        const range = $(".ba-range", slider);
        if (range) setBeforeAfter(slider, range.value);
      });
    });
  }

  function safeStoredProjects() {
    try {
      const data = JSON.parse(localStorage.getItem("royaltyProjects") || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Could not read stored projects", error);
      return [];
    }
  }

  function createProjectCard(project, compact = false) {
    const col = document.createElement("div");
    const title = project.title || "Uploaded paint project";
    const type = project.type || "Paint Project";
    const notes = project.notes || project.description || "Project gallery picture uploaded from the admin panel.";
    const isSingle = !!project.image || project.mode === "single";
    col.className = isSingle || compact ? "col-md-6 col-xl-4" : "col-lg-6";
    col.setAttribute("data-project-item", "");
    col.dataset.category = type;
    col.dataset.title = title;
    col.dataset.date = project.createdAt || project.date || "";

    if (isSingle) {
      col.innerHTML = `
        <article class="product-card glass-card lift-card h-100">
          <img class="product-thumb" src="" alt="${escapeHtml(title)}">
          <div class="product-tags mb-2"><span class="tag">${escapeHtml(type)}</span>${project.date ? `<span class="tag">${escapeHtml(project.date)}</span>` : ""}</div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(notes)}</p>
        </article>`;
      const img = $("img", col);
      img.src = project.image || project.after || project.before || "assets/img/web/interior-finish.jpg";
      return col;
    }

    col.innerHTML = `
      <article class="ba-card glass-card lift-card h-100">
        <div class="ba-slider">
          <img src="" alt="Before view of ${escapeHtml(title)}" class="ba-before">
          <div class="ba-after"><img src="" alt="After view of ${escapeHtml(title)}"></div>
          <span class="ba-label after">After</span>
          <span class="ba-label before">Before</span>
          <span class="ba-handle">↔</span>
          <input class="ba-range" type="range" min="5" max="95" value="55" aria-label="Compare before and after images">
        </div>
        <div class="ba-content">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="tag">${escapeHtml(type)}</span>
            ${project.date ? `<span class="tag">${escapeHtml(project.date)}</span>` : ""}
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(notes)}</p>
        </div>
      </article>`;

    const before = $(".ba-before", col);
    const after = $(".ba-after img", col);
    before.src = project.before || "assets/img/web/before-interior.jpg";
    after.src = project.after || "assets/img/web/interior-finish.jpg";
    return col;
  }

  function renderStoredProjects() {
    const container = $("#storedProjects");
    const homeContainer = $("#homeStoredProjects");
    const projects = safeStoredProjects();

    if (container) {
      container.innerHTML = "";
      projects.forEach((project) => container.appendChild(createProjectCard(project)));
    }

    if (homeContainer) {
      homeContainer.innerHTML = "";
      projects.slice(0, 2).forEach((project) => homeContainer.appendChild(createProjectCard(project, true)));
      if (!projects.length) homeContainer.closest("section")?.classList.add("d-none");
    }

    if (container || homeContainer) initBeforeAfter();
    applyProjectFilters();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeStoredReviews() {
    try {
      const data = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Could not read reviews", error);
      return [];
    }
  }

  function saveStoredReviews(reviews) {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
  }

  function ratingStars(rating) {
    const value = Math.max(1, Math.min(5, Number(rating) || 5));
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  function createReviewCard(review) {
    const col = document.createElement("div");
    col.className = "col-md-6";
    const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
    col.innerHTML = `
      <article class="review-card glass-card lift-card">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div class="review-stars" aria-label="${rating} out of 5 stars">${ratingStars(rating)}</div>
          <span class="tag">${escapeHtml(review.service || "Customer")}</span>
        </div>
        <blockquote>“${escapeHtml(review.message || "Great paint and finishing service.")}”</blockquote>
        <div class="review-person">${escapeHtml(review.name || "Royalty Paints Customer")}</div>
        <div class="review-meta">${escapeHtml(review.date || "Recent review")}</div>
      </article>`;
    return col;
  }

  function renderReviews() {
    const lists = $$("[data-review-list]");
    const stored = safeStoredReviews();
    const reviews = [...stored, ...DEFAULT_REVIEWS];
    const count = reviews.length;
    const average = count ? (reviews.reduce((sum, item) => sum + (Number(item.rating) || 5), 0) / count).toFixed(1) : "5.0";

    $$("[data-review-count]").forEach((el) => { el.textContent = count; });
    $$("[data-review-average]").forEach((el) => { el.textContent = average; });

    lists.forEach((list) => {
      list.innerHTML = "";
      reviews.slice(0, 6).forEach((review) => list.appendChild(createReviewCard(review)));
    });
  }

  function initReviewForms() {
    renderReviews();
    $$("[data-review-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const rating = Number(formData.get("rating") || 5);
        const name = String(formData.get("name") || "").trim();
        const service = String(formData.get("service") || "Customer Review").trim();
        const message = String(formData.get("message") || "").trim();
        if (!name || !message) return;

        const reviews = safeStoredReviews();
        reviews.unshift({
          id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `review-${Date.now()}`,
          name,
          service,
          rating,
          message,
          date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        });
        saveStoredReviews(reviews);
        const reviewText = `Hello ${CONTACT.company}, I want to drop a customer review. Rating: ${rating}/5. Name: ${name}. Service: ${service}. Review: ${message}`;
        window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(reviewText)}`, "_blank", "noopener,noreferrer");
        form.reset();
        const status = $("[data-review-status]", form);
        if (status) {
          status.classList.remove("d-none");
          clearTimeout(status._timer);
          status._timer = setTimeout(() => status.classList.add("d-none"), 4200);
        }
        renderReviews();
      });
    });
  }

  function handleQuoteForms() {
    $$("[data-quote-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const name = formData.get("name") || "Customer";
        const phone = formData.get("phone") || "";
        const service = formData.get("service") || "Painting / paint supply";
        const message = formData.get("message") || "I want a quotation.";
        const location = formData.get("location") || "";
        const text = `Hello ${CONTACT.company}, my name is ${name}. I need ${service}. ${message} ${location ? `Location: ${location}.` : ""}${phone ? ` My phone: ${phone}` : ""}`;
        const url = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      });
    });
  }

  function initParallax() {
    const heroVisual = $(".hero-visual");
    if (!heroVisual || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 991px)").matches) return;
    let frame = 0;
    let latestEvent = null;
    const update = () => {
      if (!latestEvent) return;
      const rect = heroVisual.getBoundingClientRect();
      const x = (latestEvent.clientX - rect.left) / rect.width - .5;
      const y = (latestEvent.clientY - rect.top) / rect.height - .5;
      $$(".liquid-orb", heroVisual).forEach((orb, index) => {
        const strength = (index + 1) * 3;
        orb.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
      });
      frame = 0;
    };
    heroVisual.addEventListener("pointermove", (event) => {
      latestEvent = event;
      if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });
  }

  function normalizeProjectCategory(value) {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("residential") || raw.includes("interior") || raw.includes("satin")) return "residential interior";
    if (raw.includes("exterior") || raw.includes("weather") || raw.includes("facade") || raw.includes("flex")) return "exterior painting";
    if (raw.includes("commercial") || raw.includes("school") || raw.includes("hotel") || raw.includes("office") || raw.includes("public")) return "commercial project";
    if (raw.includes("wood") || raw.includes("gloss")) return "wood & gloss finish";
    if (raw.includes("other")) return "other paint project";
    return raw.trim();
  }

  function projectDateValue(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function applyProjectFilters() {
    const categoryControl = $("#projectCategoryFilter");
    const sortControl = $("#projectSortSelect");
    if (!categoryControl && !sortControl) return;
    const selectedCategory = normalizeProjectCategory(categoryControl?.value || "all");
    const sort = sortControl?.value || "featured";

    const hiddenDefaults = hiddenDefaultProjectSet();
    $$("[data-project-list]").forEach((list) => {
      const items = $$('[data-project-item]', list);
      items.forEach((item, index) => {
        if (!item.dataset.originalOrder) item.dataset.originalOrder = String(index);
      });

      const sorted = [...items].sort((a, b) => {
        if (sort === "az") return String(a.dataset.title || "").localeCompare(String(b.dataset.title || ""));
        if (sort === "za") return String(b.dataset.title || "").localeCompare(String(a.dataset.title || ""));
        if (sort === "newest") return projectDateValue(b.dataset.date) - projectDateValue(a.dataset.date);
        return Number(a.dataset.originalOrder || 0) - Number(b.dataset.originalOrder || 0);
      });
      sorted.forEach((item) => list.appendChild(item));

      let visibleCount = 0;
      sorted.forEach((item) => {
        const itemCategory = normalizeProjectCategory(item.dataset.category || "");
        const defaultId = item.getAttribute("data-default-project");
        const hiddenByAdmin = defaultId ? hiddenDefaults.has(defaultId) : false;
        const visible = !hiddenByAdmin && (selectedCategory === "all" || itemCategory === selectedCategory);
        item.classList.toggle("d-none", !visible);
        if (visible) visibleCount += 1;
      });
      list.dataset.visibleCount = String(visibleCount);
    });
  }

  function initProjectFilters() {
    const categoryControl = $("#projectCategoryFilter");
    const sortControl = $("#projectSortSelect");
    const resetButton = $("#resetProjectFilters");
    if (!categoryControl && !sortControl && !resetButton) return;
    if (categoryControl && categoryControl.dataset.ready !== "yes") {
      categoryControl.dataset.ready = "yes";
      categoryControl.addEventListener("change", applyProjectFilters);
    }
    if (sortControl && sortControl.dataset.ready !== "yes") {
      sortControl.dataset.ready = "yes";
      sortControl.addEventListener("change", applyProjectFilters);
    }
    if (resetButton && resetButton.dataset.ready !== "yes") {
      resetButton.dataset.ready = "yes";
      resetButton.addEventListener("click", () => {
        if (categoryControl) categoryControl.value = "all";
        if (sortControl) sortControl.value = "featured";
        applyProjectFilters();
      });
    }
    applyProjectFilters();
  }

  function initRoyaltyLoader() {
    if (document.readyState === "complete") return;
    let loader = null;
    let visible = false;

    const buildLoader = () => {
      if (document.readyState === "complete" || visible) return;
      visible = true;
      loader = document.createElement("div");
      loader.className = "royalty-loader runtime-loader";
      loader.id = "royaltyLoader";
      loader.setAttribute("role", "status");
      loader.setAttribute("aria-live", "polite");
      loader.setAttribute("aria-label", "Loading page");
      loader.innerHTML = `
        <div class="page-skeleton" aria-hidden="true">
          <div class="ps-header"><span class="ps-logo"></span><span class="ps-action"></span></div>
          <div class="ps-hero">
            <div class="ps-copy">
              <span class="ps-pill"></span>
              <span class="ps-title ps-title-1"></span>
              <span class="ps-title ps-title-2"></span>
              <span class="ps-line ps-line-1"></span>
              <span class="ps-line ps-line-2"></span>
            </div>
            <div class="ps-media"><span class="ps-media-block"></span></div>
          </div>
        </div>`;
      document.body.prepend(loader);
    };

    const showTimer = window.setTimeout(buildLoader, 1400);
    const hideLoader = () => {
      window.clearTimeout(showTimer);
      if (!loader) return;
      loader.classList.add("is-hidden");
      window.setTimeout(() => loader?.remove(), 650);
    };

    window.addEventListener("load", hideLoader, { once: true });
    window.setTimeout(hideLoader, 6500);
  }

  function initScrollHeader() {
    const header = $(".site-header");
    if (!header) return;
    let lastY = window.scrollY || 0;
    let ticking = false;
    const revealLimit = 24;

    const update = () => {
      const currentY = Math.max(window.scrollY || 0, 0);
      const isMenuOpen = !!$(".navbar-collapse.show, .navbar-collapse.collapsing", header);
      header.classList.toggle("is-scrolled", currentY > 8);
      if (isMenuOpen || currentY < 90) {
        header.classList.remove("is-hidden");
      } else if (currentY > lastY + revealLimit) {
        header.classList.add("is-hidden");
      } else if (currentY < lastY - 8) {
        header.classList.remove("is-hidden");
      }
      lastY = currentY;
      ticking = false;
    };

    const requestUpdate = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    document.addEventListener("scroll", requestUpdate, { passive: true });
    $$(".navbar-toggler", header).forEach((btn) => btn.addEventListener("click", () => header.classList.remove("is-hidden")));
  }


  function currentTheme() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "light" || theme === "dark" ? theme : "light";
  }

  let themeBlendTimer;
  function flagThemeBlend() {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("theme-switching");
    window.clearTimeout(themeBlendTimer);
    themeBlendTimer = window.setTimeout(() => root.classList.remove("theme-switching"), 460);
  }

  function applyTheme(theme, persist = true) {
    const selected = theme === "light" ? "light" : "dark";
    if (persist && document.documentElement.getAttribute("data-theme") !== selected) flagThemeBlend();
    document.documentElement.setAttribute("data-theme", selected);
    document.body?.setAttribute("data-theme", selected);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected === "light" ? "#ffffff" : "#030716");
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, selected);
      } catch (error) {
        console.warn("Could not save colour theme", error);
      }
    }
    $$('[data-theme-toggle]').forEach((control) => {
      const next = selected === "light" ? "dark" : "light";
      control.setAttribute("aria-label", `Switch to ${next} mode`);
      control.setAttribute("aria-pressed", selected === "dark" ? "true" : "false");
      control.dataset.themeState = selected;
      if (control.matches('input[type="checkbox"]')) control.checked = selected === "light";
      const label = control.id ? document.querySelector(`label[for="${control.id}"]`) : null;
      label?.setAttribute("aria-label", `Switch to ${next} mode`);
    });
  }

  function initThemeToggle() {
    applyTheme(currentTheme(), false);
    $$('[data-theme-toggle]').forEach((control) => {
      if (control.dataset.themeReady === "yes") return;
      control.dataset.themeReady = "yes";
      const update = () => {
        const nextTheme = control.matches('input[type="checkbox"]') ? (control.checked ? "light" : "dark") : (currentTheme() === "light" ? "dark" : "light");
        applyTheme(nextTheme);
      };
      control.addEventListener(control.matches('input[type="checkbox"]') ? "change" : "click", update);
    });
  }

  function initDrawerNav() {
    const toggle = $("#navToggle");
    const header = $(".site-header");
    const drawer = $(".site-menu");
    if (!toggle || !drawer) return;

    // the header is a containing block, so a backdrop inside it can only cover the header.
    // move it to <body> so the dim/blur layer spans the whole viewport.
    const backdrop = $(".menu-backdrop");
    if (backdrop && backdrop.parentElement !== document.body) {
      document.body.appendChild(backdrop);
      backdrop.classList.add("menu-backdrop-detached");
    }

    const resetPageLock = () => {
      document.documentElement.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };

    const closeDrawer = () => {
      toggle.checked = false;
      header?.classList.remove("menu-open");
      document.body.classList.remove("nav-blur");
      drawer.classList.remove("is-oversliding");
      resetPageLock();
    };

    toggle.addEventListener("change", () => {
      header?.classList.toggle("menu-open", toggle.checked);
      document.body.classList.toggle("nav-blur", toggle.checked);
      if (toggle.checked) {
        drawer.classList.remove("is-oversliding");
        void drawer.offsetWidth;
        drawer.classList.add("is-oversliding");
      } else {
        drawer.classList.remove("is-oversliding");
      }
      resetPageLock();
    });

    $$("a", drawer).forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href") || "";
        const url = new URL(href, window.location.href);
        const currentFile = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
        const targetFile = (url.pathname.split("/").pop() || "index.html").toLowerCase();
        const samePageHash = currentFile === targetFile && url.hash;
        if (samePageHash) {
          event.preventDefault();
          closeDrawer();
          window.setTimeout(() => {
            document.querySelector(url.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", url.hash);
          }, 80);
          return;
        }
        window.setTimeout(closeDrawer, 30);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.checked) closeDrawer();
    });
    window.addEventListener("pagehide", resetPageLock);
    window.addEventListener("resize", resetPageLock, { passive: true });
  }

  function initMobileNavGuard() {
    const header = $(".site-header");
    const nav = $("#mainNav");
    if (!header || !nav) return;
    let savedScrollY = 0;

    const isMobile = () => window.innerWidth < 992;
    const lockPage = () => {
      if (!isMobile() || document.body.classList.contains("nav-open")) return;
      savedScrollY = window.scrollY || 0;
      header.classList.add("menu-open");
      document.documentElement.classList.add("nav-open");
      document.body.classList.add("nav-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlockPage = () => {
      header.classList.remove("menu-open");
      document.documentElement.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (isMobile()) window.scrollTo(0, savedScrollY);
    };

    nav.addEventListener("show.bs.collapse", lockPage);
    nav.addEventListener("hide.bs.collapse", unlockPage);
    nav.addEventListener("hidden.bs.collapse", unlockPage);
    $$("a", nav).forEach((link) => {
      link.addEventListener("click", (event) => {
        if (!isMobile()) return;
        const href = link.getAttribute("href") || "";
        const url = new URL(href, window.location.href);
        const samePageHash = url.pathname === window.location.pathname && url.hash;
        const collapse = window.bootstrap?.Collapse.getOrCreateInstance(nav, { toggle: false });
        if (samePageHash) {
          event.preventDefault();
          const target = $(url.hash);
          collapse?.hide();
          window.setTimeout(() => target?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
        } else {
          collapse?.hide();
        }
      });
    });
    window.addEventListener("resize", () => {
      if (!isMobile()) unlockPage();
    }, { passive: true });
  }

  function hiddenDefaultProjectSet() {
    try {
      const data = JSON.parse(localStorage.getItem(HIDDEN_DEFAULT_PROJECTS_KEY) || "[]");
      return new Set(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Could not read default project visibility", error);
      return new Set();
    }
  }

  function applyDefaultProjectVisibility() {
    const hidden = hiddenDefaultProjectSet();
    $$('[data-default-project]').forEach((el) => {
      const id = el.getAttribute("data-default-project");
      el.classList.toggle("d-none", hidden.has(id));
    });
    $$('[data-default-section]').forEach((section) => section.classList.remove("d-none"));
  }

  function setYear() {
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initRoyaltyLoader();
    initThemeToggle();
    initDrawerNav();
    watchViewportState();
    initScrollHeader();
    initMobileNavGuard();
    setActiveNav();
    initLiquidMenuIndicator();
    scrollProgress();
    revealOnScroll();
    buttonRipples();
    initCounters();
    initBeforeAfter();
    applyDefaultProjectVisibility();
    renderStoredProjects();
    initProjectFilters();
    initReviewForms();
    handleQuoteForms();
    initParallax();
    setYear();
  });
})();
