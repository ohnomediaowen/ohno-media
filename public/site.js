/* ohno.media: loads saved edits for every visitor, and provides edit mode at ?edit */
(function () {
  const ALLOWED = { BR: [], SPAN: ["class"], EM: [], STRONG: [], B: [], I: [], SUP: [] };
  const okLink = (v) => /^(https?:\/\/|mailto:|#)/i.test((v || "").trim());
  const okImage = (v) => /^\/api\/image\/[a-z0-9-]+(\?v=\d+)?$/.test(v || "");

  function clean(node) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 1) {
        clean(c);
        if (!(c.tagName in ALLOWED)) c.replaceWith(...c.childNodes);
        else [...c.attributes].forEach((a) => { if (!ALLOWED[c.tagName].includes(a.name)) c.removeAttribute(a.name); });
      } else if (c.nodeType !== 3) c.remove();
    });
  }
  function sanitize(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    clean(t.content);
    return t.innerHTML.replace(/&nbsp;/g, " ").trim();
  }
  const q = (attr, key) => document.querySelector(`[${attr}="${key}"]`);

  let saved = { text: {}, links: {}, images: {} };

  function apply(c) {
    for (const [k, v] of Object.entries(c.text || {})) { const el = q("data-edit", k); if (el) el.innerHTML = sanitize(v); }
    for (const [k, v] of Object.entries(c.links || {})) { const el = q("data-link", k); if (el && okLink(v)) el.setAttribute("href", v.trim()); }
    for (const [k, v] of Object.entries(c.images || {})) { const el = q("data-img", k); if (el && okImage(v)) el.src = v; }
  }

  const reveal = () => document.documentElement.classList.remove("loading");
  const loaded = fetch("/api/content", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((c) => {
      saved = { text: c.text || {}, links: c.links || {}, images: c.images || {} };
      apply(saved);
    })
    .catch(() => {})
    .finally(reveal);
  setTimeout(reveal, 1500);

  if (!/[?&]edit\b/.test(location.search)) return;

  /* ---------------- edit mode ---------------- */
  const css = `
  .ed-bar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:1000;display:flex;align-items:center;gap:10px;flex-wrap:nowrap;justify-content:center;
    background:#3a2a1e;color:#fbf3e2;padding:10px 12px 10px 18px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.3);font:600 14px/1.2 "DM Sans",system-ui,sans-serif;max-width:calc(100vw - 24px)}
  .ed-bar{white-space:nowrap}
  @media(max-width:700px){.ed-bar{flex-wrap:wrap;white-space:normal;border-radius:22px}}
  .ed-bar button{font:inherit;border:0;border-radius:999px;padding:9px 16px;cursor:pointer;background:#fbf3e2;color:#3a2a1e}
  .ed-bar button.go{background:#e0692a;color:#fff}
  .ed-bar button:disabled{opacity:.5;cursor:default}
  .ed-bar .msg{opacity:.85;font-weight:500}
  .ed-link{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:1000;display:none;gap:8px;align-items:center;background:#fbf3e2;border:3px solid #3a2a1e;border-radius:16px;padding:10px 12px;box-shadow:6px 6px 0 #3a2a1e;font:600 14px "DM Sans",sans-serif;color:#3a2a1e;width:min(560px,calc(100vw - 24px))}
  .ed-link input{flex:1;min-width:0;font:inherit;font-weight:500;padding:8px 10px;border:2px solid #3a2a1e;border-radius:10px;background:#fff}
  .ed-link button{font:inherit;border:0;border-radius:999px;padding:8px 14px;background:#e0692a;color:#fff;cursor:pointer}
  body.editing [data-edit]{outline:2px dashed rgba(224,105,42,.55);outline-offset:3px;border-radius:4px;cursor:text}
  body.editing [data-edit]:hover{outline-color:#e0692a;background:rgba(224,105,42,.08)}
  body.editing [data-edit]:focus{outline:3px solid #7d5ba6;background:rgba(125,91,166,.08)}
  body.editing [data-edit].changed{outline-style:solid}
  body.editing [data-img]{cursor:pointer;outline:3px dashed #7d5ba6;outline-offset:-3px}
  body.editing [data-img]:hover{filter:brightness(.85)}
  body.editing{padding-bottom:90px}
  .ed-modal{position:fixed;inset:0;z-index:1001;background:rgba(58,42,30,.55);display:flex;align-items:center;justify-content:center;padding:20px}
  .ed-modal form{background:#fbf3e2;border:3px solid #3a2a1e;border-radius:22px;box-shadow:8px 8px 0 #3a2a1e;padding:28px;width:min(380px,100%);font-family:"DM Sans",sans-serif;color:#3a2a1e}
  .ed-modal h3{font-family:Shrikhand,serif;font-weight:400;font-size:28px;margin-bottom:6px}
  .ed-modal p{font-size:15px;margin-bottom:16px;color:#7a6553}
  .ed-modal input{width:100%;font:500 16px "DM Sans",sans-serif;padding:12px 14px;border:3px solid #3a2a1e;border-radius:12px;margin-bottom:12px}
  .ed-modal button{width:100%;font:700 16px "DM Sans",sans-serif;padding:12px;border:3px solid #3a2a1e;border-radius:999px;background:#e0692a;color:#fff;cursor:pointer}
  .ed-modal .err{color:#c9521d;font-weight:700;font-size:14px;min-height:20px;margin:-4px 0 8px}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  let pw = "";
  try { pw = sessionStorage.getItem("ohno-pw") || ""; } catch (e) {}

  const api = (path, opts = {}) =>
    fetch(path, { ...opts, headers: { "x-edit-password": pw, ...(opts.headers || {}) } });

  function login(err) {
    const m = document.createElement("div");
    m.className = "ed-modal";
    m.innerHTML = `<form><h3>Edit mode</h3><p>Enter your password to edit the site.</p>
      <input type="password" autocomplete="current-password" placeholder="Password" required>
      <div class="err">${err || ""}</div><button>Start editing</button></form>`;
    document.body.appendChild(m);
    const input = m.querySelector("input");
    input.focus();
    m.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      pw = input.value;
      const r = await api("/api/auth", { method: "POST" }).catch(() => null);
      if (r && r.ok) {
        try { sessionStorage.setItem("ohno-pw", pw); } catch (e) {}
        m.remove();
        start();
      } else {
        m.querySelector(".err").textContent = r && r.status === 429 ? "Too many tries. Wait a minute." : "That password didn't work.";
        input.select();
      }
    });
  }

  const changed = { text: new Set(), links: {}, images: {} };
  let dirty = false;
  let bar, msg, saveBtn, linkBox, linkInput, activeLink = null;

  function setDirty(v) {
    dirty = v;
    saveBtn.disabled = !v;
    msg.textContent = v ? "Unsaved changes" : "Click any text to change it";
  }

  function start() {
    document.body.classList.add("editing");
    document.querySelectorAll("[data-edit]").forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
    });

    bar = document.createElement("div");
    bar.className = "ed-bar";
    bar.innerHTML = `<span>✏️ Editing</span><span class="msg"></span>
      <button class="go" data-a="save" disabled>Save changes</button>
      <button data-a="reset" title="Remove every saved edit and go back to the original site">Reset all</button>
      <button data-a="exit">Exit</button>`;
    document.body.appendChild(bar);
    msg = bar.querySelector(".msg");
    saveBtn = bar.querySelector('[data-a="save"]');
    setDirty(false);
    bar.addEventListener("click", (e) => {
      const a = e.target.dataset.a;
      if (a === "save") save();
      if (a === "exit") {
        if (dirty && !confirm("You have unsaved changes. Leave without saving?")) return;
        dirty = false;
        location.href = location.pathname + location.hash;
      }
      if (a === "reset") resetAll();
    });

    linkBox = document.createElement("div");
    linkBox.className = "ed-link";
    linkBox.innerHTML = `<span>🔗</span><input type="url" placeholder="https://…"><button>Apply</button>`;
    document.body.appendChild(linkBox);
    linkInput = linkBox.querySelector("input");
    const applyLink = () => {
      const v = linkInput.value.trim();
      if (!activeLink) return;
      if (!okLink(v)) { linkInput.style.borderColor = "#c9521d"; return; }
      linkInput.style.borderColor = "";
      activeLink.setAttribute("href", v);
      changed.links[activeLink.dataset.link] = v;
      setDirty(true);
      linkBox.style.display = "none";
    };
    linkBox.querySelector("button").addEventListener("click", applyLink);
    linkInput.addEventListener("keydown", (e) => { if (e.key === "Enter") applyLink(); });

    document.addEventListener("input", (e) => {
      const el = e.target.closest && e.target.closest("[data-edit]");
      if (!el) return;
      el.classList.add("changed");
      changed.text.add(el.dataset.edit);
      setDirty(true);
    });

    document.addEventListener("keydown", (e) => {
      const el = e.target.closest && e.target.closest("[data-edit]");
      if (el && e.key === "Enter") { e.preventDefault(); document.execCommand("insertLineBreak"); }
    });

    document.addEventListener("paste", (e) => {
      const el = e.target.closest && e.target.closest("[data-edit]");
      if (!el) return;
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest(".ed-bar,.ed-link,.ed-modal")) return;
      const img = e.target.closest("[data-img]");
      if (img) { e.preventDefault(); pickImage(img); return; }
      const link = e.target.closest("[data-link]");
      if (link) {
        e.preventDefault();
        activeLink = link;
        linkInput.value = link.getAttribute("href");
        linkBox.style.display = "flex";
        return;
      }
      if (!e.target.closest("[data-edit]")) linkBox.style.display = "none";
    }, true);

    window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  function pickImage(img) {
    const f = document.createElement("input");
    f.type = "file";
    f.accept = "image/png,image/jpeg,image/webp,image/gif";
    f.onchange = async () => {
      const file = f.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { msg.textContent = "Image must be under 4 MB"; return; }
      msg.textContent = "Uploading image…";
      const r = await api(`/api/upload/${img.dataset.img}`, { method: "PUT", headers: { "content-type": file.type }, body: file }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (r && r.ok && d.url) {
        img.src = d.url;
        changed.images[img.dataset.img] = d.url;
        setDirty(true);
        msg.textContent = "Image uploaded. Click Save to keep it.";
      } else msg.textContent = d.error || "Upload failed";
    };
    f.click();
  }

  async function post(content) {
    const r = await api("/api/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(content) }).catch(() => null);
    if (r && r.status === 401) {
      try { sessionStorage.removeItem("ohno-pw"); } catch (e) {}
      msg.textContent = "Password expired. Reload the page to log in again.";
      return false;
    }
    if (!r || !r.ok) { msg.textContent = "Save failed. Check your connection and try again."; return false; }
    return true;
  }

  async function save() {
    saveBtn.disabled = true;
    msg.textContent = "Saving…";
    const next = {
      text: { ...saved.text },
      links: { ...saved.links, ...changed.links },
      images: { ...saved.images, ...changed.images },
    };
    changed.text.forEach((k) => {
      const el = q("data-edit", k);
      if (!el) return;
      next.text[k] = sanitize(el.innerHTML);
      // keep an email link in sync with its text
      const a = el.closest("a[data-link]");
      const t = el.textContent.trim();
      if (a && /^mailto:/i.test(a.getAttribute("href")) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
        a.setAttribute("href", "mailto:" + t);
        next.links[a.dataset.link] = "mailto:" + t;
      }
    });
    if (await post(next)) {
      saved = next;
      changed.text.clear(); changed.links = {}; changed.images = {};
      document.querySelectorAll(".changed").forEach((el) => el.classList.remove("changed"));
      setDirty(false);
      msg.textContent = "Saved ✓ Your changes are live.";
    } else saveBtn.disabled = false;
  }

  async function resetAll() {
    if (!confirm("Remove ALL your saved edits and go back to the original site? This can't be undone.")) return;
    msg.textContent = "Resetting…";
    if (await post({ text: {}, links: {}, images: {} })) { dirty = false; location.reload(); }
  }

  loaded.then(() => (pw ? api("/api/auth", { method: "POST" }).then((r) => (r.ok ? start() : login())) : login()));
})();
