(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lang = function () { return root.getAttribute("data-lang") === "tr" ? "tr" : "en"; };
  var t = function (en, tr) { return lang() === "tr" ? tr : en; };

  /* ---------- Language ---------- */
  var langBtn = $("[data-lang-toggle]");
  if (langBtn) {
    langBtn.addEventListener("click", function () {
      var next = lang() === "en" ? "tr" : "en";
      root.setAttribute("data-lang", next);
      root.lang = next;
      try { localStorage.setItem("lang", next); } catch (e) { /* storage blocked */ }
      document.title = next === "tr"
        ? "Serkan Gümüş — Yazılım Geliştirici & 3D Tasarımcı"
        : "Serkan Gümüş — Software Developer & 3D Designer";
    });
    if (lang() === "tr") document.title = "Serkan Gümüş — Yazılım Geliştirici & 3D Tasarımcı";
  }

  /* ---------- Header ---------- */
  var header = $("[data-header]");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = $("[data-menu-btn]"), menu = $("[data-menu]");
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (open) header.classList.add("is-scrolled"); else onScroll();
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  $$("[data-close-menu]").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  window.addEventListener("resize", function () { if (window.innerWidth > 960) setMenu(false); });

  /* ---------- Active nav ---------- */
  var navLinks = $$("[data-nav]");
  if ("IntersectionObserver" in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove("is-active"); });
        var id = e.target.id === "skills" ? "about" : e.target.id;
        if (map[id]) map[id].classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["top", "work", "experience", "about", "skills", "contact"].forEach(function (id) {
      var el = document.getElementById(id); if (el) io.observe(el);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    // stagger siblings that enter together
    var ro = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (e, i) {
        e.target.style.setProperty("--d", Math.min(i * 0.08, 0.4) + "s");
        e.target.classList.add("is-in");
        ro.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Spotlight on cards ---------- */
  if (!reduce && window.matchMedia("(pointer: fine)").matches) {
    $$("[data-spot]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Toast ---------- */
  var toast = $("[data-toast]"), toastTimer = 0;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 2600);
  }

  /* ---------- Copy email ---------- */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() { showToast(t("Email copied ✓", "E-posta kopyalandı ✓")); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { window.location.href = "mailto:" + text; }
        document.body.removeChild(ta);
      }
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $("[data-lightbox]");
  if (lb) {
    var lbImg = $("[data-lb-img]", lb), lbCap = $("[data-lb-cap]", lb);
    var items = [], index = 0, lastFocus = null;
    function unzoom() { lbImg.classList.remove("is-zoomed"); lbImg.style.transformOrigin = ""; }
    lbImg.addEventListener("click", function (e) {
      if (lbImg.classList.contains("is-zoomed")) { unzoom(); return; }
      var r = lbImg.getBoundingClientRect();
      lbImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
      lbImg.classList.add("is-zoomed");
    });
    function render() {
      unzoom();
      var img = items[index];
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = img.alt + "  ·  " + (index + 1) + " / " + items.length;
    }
    function open(gallery, i) {
      items = $$("img", gallery); index = i; lastFocus = document.activeElement;
      render(); lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add("is-open"); });
      root.style.overflow = "hidden";
      $("[data-lb-close]", lb).focus();
    }
    function close() {
      lb.classList.remove("is-open"); root.style.overflow = "";
      setTimeout(function () { lb.hidden = true; }, reduce ? 0 : 250);
      if (lastFocus) lastFocus.focus();
    }
    function step(d) { index = (index + d + items.length) % items.length; render(); }
    $$("[data-gallery]").forEach(function (g) {
      $$("[data-open]", g).forEach(function (btn) {
        btn.addEventListener("click", function () { open(g, parseInt(btn.getAttribute("data-open"), 10) || 0); });
      });
    });
    $("[data-lb-close]", lb).addEventListener("click", close);
    $("[data-lb-prev]", lb).addEventListener("click", function () { step(-1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        var f = $$("button", lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Contact form ----------
     Sends through FormSubmit (no backend needed). The very first message triggers a one-time
     activation email to the inbox; until then, or if anything fails, it falls back to the
     visitor's mail app with the message pre-filled, so a message is never lost. */
  var EMAIL = "srkangmss@gmail.com";
  var FORM_ID = "c75bc41dfefc2b1b82b4edb3f345d188"; // FormSubmit alias for the inbox above
  var form = $("[data-form]");
  if (form) {
    var status = $("[data-status]"), submit = $("[data-submit]", form);
    function setStatus(msg, kind) {
      status.textContent = msg;
      status.className = "form-status" + (kind ? " is-" + kind : "");
    }
    function mailtoFallback(d) {
      var body = d.message + "\n\n— " + d.name + " (" + d.email + ")";
      window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Portfolio — " + d.name) + "&body=" + encodeURIComponent(body);
      setStatus(t("Opening your mail app…", "E-posta uygulaman açılıyor…"), "");
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form._honey && form._honey.value) return;
      var ok = true;
      ["name", "email", "message"].forEach(function (n) {
        var el = form.elements[n];
        var valid = el.value.trim() !== "" && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.closest(".field").classList.toggle("is-invalid", !valid);
        if (!valid) ok = false;
      });
      if (!ok) { setStatus(t("Please fill in all fields correctly.", "Lütfen tüm alanları doğru doldur."), "error"); return; }

      var data = { name: form.name.value.trim(), email: form.email.value.trim(), message: form.message.value.trim() };
      submit.disabled = true;
      setStatus(t("Sending…", "Gönderiliyor…"), "");

      fetch("https://formsubmit.co/ajax/" + FORM_ID, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: data.name, email: data.email, message: data.message,
          _subject: "Portfolio message — " + data.name, _template: "table", _captcha: "false"
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && (res.success === true || res.success === "true")) {
            form.reset();
            setStatus(t("Thanks! Your message is on its way.", "Teşekkürler! Mesajın iletildi."), "ok");
            showToast(t("Message sent ✓", "Mesaj gönderildi ✓"));
          } else { mailtoFallback(data); }
        })
        .catch(function () { mailtoFallback(data); })
        .then(function () { submit.disabled = false; });
    });
    $$(".field input, .field textarea", form).forEach(function (el) {
      el.addEventListener("input", function () { el.closest(".field").classList.remove("is-invalid"); });
    });
  }

  /* ---------- Year ---------- */
  var y = $("[data-year]"); if (y) y.textContent = String(new Date().getFullYear());
})();
