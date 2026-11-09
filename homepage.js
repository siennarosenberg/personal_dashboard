// Load after app.js. Adds search, bookmarks, and private Gmail previews.
(() => {
  "use strict";
  if (document.getElementById("home-search")) return;
  const node = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const store = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const button = (text, action) => {
    const n = node("button", "pill-btn", text);
    n.type = "button";
    n.addEventListener("click", action);
    return n;
  };
  const link = (text, url, cls = "pill-btn") => {
    const a = node("a", cls, text);
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    return a;
  };
  const input = (type, label, placeholder) => {
    const n = node("input");
    n.type = type; n.setAttribute("aria-label", label);
    n.placeholder = placeholder; return n;
  };
  const card = (title, id) => {
    const section = node("section", "card home-card");
    const head = node("div", "card-head");
    const h = node("h2", "", title); h.id = id;
    section.setAttribute("aria-labelledby", id);
    head.append(h); section.append(head); return section;
  };
  const style = node("style");
  style.textContent = `
    .home-search {display:flex;gap:.65rem;align-items:center;max-width:760px;margin:0 auto 1.5rem;padding:.55rem .6rem .55rem 1.1rem;background:var(--card);border:1px solid var(--line);border-radius:999px;backdrop-filter:blur(14px)}
    .home-search input {flex:1;min-width:0;background:transparent;border:0;color:var(--ink);font:inherit;padding:.45rem}
    .home-search input:focus {outline:0}
    .home-search:focus-within {outline:2px solid var(--accent)}
    .home-search button {border:0;background:var(--accent);color:white;border-radius:999px;padding:.6rem 1rem;font:inherit;cursor:pointer}
    .home-links,.home-actions {display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
    .home-links {margin-bottom:.8rem}
    .home-card a {text-decoration:none}
    .home-bookmark {display:flex;align-items:center;gap:.4rem;border:1px solid var(--line);border-radius:12px;padding:.5rem .6rem;min-width:0;max-width:100%;background:rgba(255,255,255,.45)}
    .home-bookmark a {color:var(--ink);overflow-wrap:anywhere}
    .home-remove {border:0;background:transparent;color:var(--muted);font-size:1.1rem;cursor:pointer;padding:.2rem .4rem}
    .home-card details {margin-top:.8rem}
    .home-card summary {cursor:pointer;color:var(--muted);font-size:.85rem}
    .home-card .add {margin-top:.6rem;flex-wrap:wrap}
    .home-card .add input[type=text] {min-width:0;flex:1 1 130px;width:100%}
    .home-card .add button {width:auto;min-width:2.3rem;padding:.4rem .65rem}
    .home-status {font-size:.82rem;color:var(--muted);overflow-wrap:anywhere;min-height:1.2em}
    .home-mail {display:block;color:var(--ink);border-bottom:1px solid var(--line);padding:.7rem 0;overflow-wrap:anywhere}
    .home-mail:last-child {border:0}
    .home-mail strong,.home-mail span {display:block}
    .home-mail strong {font-size:.92rem;font-weight:600}
    .home-mail .home-sender {font-size:.76rem;color:var(--accent);margin-bottom:.15rem}
    .home-mail .home-snippet {font-size:.82rem;color:var(--muted);margin-top:.25rem}
    .home-account {font-size:.8rem;color:var(--muted);overflow-wrap:anywhere}
    .home-card .pill-btn {font-size:.8rem;padding:.35rem .65rem}
    .home-card select {font:inherit;max-width:100%;background:var(--card);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:.3rem}
    .home-card button:disabled {opacity:.55;cursor:default}
    .top-right {flex-wrap:wrap}
    @media(max-width:480px) {.home-search{border-radius:18px}.home-search button{padding:.55rem .7rem}}
  `;
  document.head.append(style);

  // Google handles the search; no API key or account connection is needed.
  const search = node("form", "home-search"); search.id = "home-search";
  search.action = "https://www.google.com/search"; search.method = "GET";
  search.setAttribute("role", "search");
  const query = input("search", "Search Google", "Search Google…");
  query.name = "q"; query.required = true;
  const searchButton = node("button", "", "Search"); searchButton.type = "submit";
  search.append(query, searchButton);
  document.querySelector(".top").after(search);

  // Bookmarks are saved in this browser and included in dashboard backups.
  const BOOKMARK_KEY = "homepage-bookmarks";
  function bookmarkUrl(value) {
    const trimmed = value.trim();
    const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : "https://" + trimmed);
    if (!["http:", "https:"].includes(u.protocol)) throw Error("Use an http or https website address.");
    return u.href;
  }
  function validBookmarks(rows) {
    return Array.isArray(rows) && rows.length <= 100 && rows.every(b => {
      if (!b || typeof b !== "object" || typeof b.name !== "string" || typeof b.url !== "string" || !b.name.trim() || b.name.length > 80 || b.url.length > 2048) return false;
      try { return /^https?:\/\//i.test(b.url) && Boolean(bookmarkUrl(b.url)); } catch { return false; }
    });
  }
  let bookmarks = read(BOOKMARK_KEY, []);
  if (!validBookmarks(bookmarks)) bookmarks = [];
  const bookmarksCard = card("Bookmarks", "home-bookmarks-title");
  const bookmarkList = node("div", "home-links");
  const bookmarkStatus = node("p", "home-status"); bookmarkStatus.setAttribute("role", "status");
  const bookmarkDetails = node("details");
  bookmarkDetails.append(node("summary", "", "Add a bookmark"));
  const bookmarkForm = node("form", "add");
  const bookmarkName = input("text", "Bookmark name", "Name"); bookmarkName.maxLength = 80; bookmarkName.required = true;
  const bookmarkAddress = input("text", "Website address", "example.com"); bookmarkAddress.maxLength = 2048; bookmarkAddress.required = true;
  const bookmarkAdd = node("button", "", "+"); bookmarkAdd.type = "submit"; bookmarkAdd.setAttribute("aria-label", "Save bookmark");
  bookmarkForm.append(bookmarkName, bookmarkAddress, bookmarkAdd);
  bookmarkDetails.append(bookmarkForm);
  bookmarksCard.append(bookmarkList, bookmarkDetails, bookmarkStatus);
  document.querySelector(".col-left").prepend(bookmarksCard);
  function renderBookmarks() {
    bookmarkList.replaceChildren();
    if (!bookmarks.length) bookmarkList.append(node("span", "home-status", "Keep your favorite sites here."));
    bookmarks.forEach((b, i) => {
      const wrap = node("div", "home-bookmark");
      const remove = button("×", () => {
        const next = bookmarks.filter((_, index) => index !== i);
        try { store(BOOKMARK_KEY, next); bookmarks = next; renderBookmarks(); }
        catch { bookmarkStatus.textContent = "Couldn't save. Browser storage may be full or unavailable."; }
      });
      remove.className = "home-remove"; remove.setAttribute("aria-label", "Remove " + b.name);
      wrap.append(link(b.name, b.url, ""), remove); bookmarkList.append(wrap);
    });
  }
  bookmarkForm.addEventListener("submit", event => {
    event.preventDefault();
    try {
      if (bookmarks.length >= 100) throw Error("You can save up to 100 bookmarks.");
      const next = [...bookmarks, {name: bookmarkName.value.trim(), url: bookmarkUrl(bookmarkAddress.value)}];
      if (!validBookmarks(next)) throw Error("Enter a name and a valid website address.");
      store(BOOKMARK_KEY, next); bookmarks = next; renderBookmarks();
      bookmarkForm.reset(); bookmarkDetails.open = false; bookmarkStatus.textContent = "Bookmark saved.";
    } catch (e) { bookmarkStatus.textContent = e.message; }
  });
  renderBookmarks();
  if (typeof BACKUP_KEYS !== "undefined" && typeof window.validateBackup === "function") {
    if (!BACKUP_KEYS.includes(BOOKMARK_KEY)) BACKUP_KEYS.push(BOOKMARK_KEY);
    const originalValidator = window.validateBackup;
    window.validateBackup = backup => {
      const rows = backup?.data?.[BOOKMARK_KEY];
      if (rows !== undefined && !validBookmarks(rows)) throw Error("Invalid bookmarks in backup.");
      const data = {...backup?.data}; delete data[BOOKMARK_KEY];
      const validated = originalValidator({...backup, data});
      return rows === undefined ? validated : {...validated, [BOOKMARK_KEY]: rows};
    };
  }

  // Gmail: all mailbox requests go directly from this browser to Google.
  // Tokens and emails stay in memory; never localStorage, backups, or GitHub.
  const gmailCard = card("Gmail highlights", "home-gmail-title");
  const actions = node("div", "home-actions");
  const filter = node("select"); filter.setAttribute("aria-label", "Email filter");
  for (const [value, label] of [["unread", "Unread inbox"], ["important", "Important + unread"], ["starred", "Starred inbox"]]) {
    const option = node("option", "", label); option.value = value; filter.append(option);
  }
  const connect = button("Connect Gmail", () => {
    if (!oauthClient) { settings.open = true; clientInput.focus(); return; }
    const attempt = ++authAttempt;
    oauthClient.callback = response => authorize(response, attempt);
    try { oauthClient.requestAccessToken({prompt: "select_account"}); }
    catch { status.textContent = "Google couldn't open sign-in. Allow popups for this dashboard and try again."; }
  });
  const refresh = button("Refresh", () => refreshMail()); refresh.disabled = true;
  const disconnect = button("Disconnect", () => {
    const oldToken = token;
    clearMail("Disconnected. Email previews have been cleared.");
    if (oldToken) {
      try { window.google.accounts.oauth2.revoke(oldToken, () => {}); }
      catch { status.textContent = "Cleared locally. You can also revoke access in your Google Account permissions."; }
    }
  }); disconnect.hidden = true;
  actions.append(filter, connect, refresh, disconnect);
  const account = node("p", "home-account");
  const status = node("p", "home-status", "Connect to see your latest messages. Only you can see them after signing in.");
  status.setAttribute("role", "status");
  const messages = node("div");
  const settings = node("details"); settings.append(node("summary", "", "Gmail setup"));
  settings.append(node("p", "home-status", "Paste your Google web client ID here once. It is a public app identifier, not a password. Never paste a client secret."));
  const config = node("form", "add");
  const clientInput = input("text", "Google OAuth client ID", "…apps.googleusercontent.com"); clientInput.required = true;
  const configSave = node("button", "", "Save"); configSave.type = "submit";
  config.append(clientInput, configSave); settings.append(config);
  gmailCard.append(actions, account, status, messages, link("Open Gmail ↗", "https://mail.google.com/"), settings);
  document.querySelector(".col-right").prepend(gmailCard);

  const CLIENT_KEY = "homepage-gmail-client-id";
  const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
  let token = "", email = "", expiresAt = 0, expiryTimer = null;
  let oauthClient = null, sdkPromise = null, authAttempt = 0, generation = 0, activeRequest = null;
  function clearMail(message) {
    authAttempt++; generation++; activeRequest?.abort(); activeRequest = null;
    clearTimeout(expiryTimer); token = ""; email = ""; expiresAt = 0;
    messages.replaceChildren(); account.textContent = ""; status.textContent = message;
    refresh.disabled = true; disconnect.hidden = true; connect.hidden = false;
    connect.textContent = "Connect Gmail";
  }
  function loadGoogle() {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = node("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true;
      const timer = setTimeout(() => {script.remove(); sdkPromise = null; reject(Error("Google sign-in timed out. Save your client ID again to retry."));}, 15000);
      script.onload = () => {clearTimeout(timer); resolve();};
      script.onerror = () => {clearTimeout(timer); script.remove(); sdkPromise = null; reject(Error("Google sign-in couldn't load. Check your connection or content blocker, then save your client ID again."));};
      document.head.append(script);
    });
    return sdkPromise;
  }
  async function initialize(clientId) {
    const version = ++generation; connect.disabled = true;
    status.textContent = "Preparing Google sign-in…";
    try {
      await loadGoogle();
      if (version !== generation) return;
      oauthClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: SCOPE, include_granted_scopes: false,
        callback: () => {},
        error_callback: () => {status.textContent = "Sign-in was closed or blocked. Click Connect Gmail to try again.";},
      });
      status.textContent = "Ready. Click Connect Gmail and choose your account.";
    } catch (e) { if (version === generation) status.textContent = e.message; }
    finally { if (version === generation) connect.disabled = false; }
  }
  config.addEventListener("submit", event => {
    event.preventDefault(); const id = clientInput.value.trim();
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) {status.textContent = "Paste the client ID ending in .apps.googleusercontent.com."; return;}
    try { store(CLIENT_KEY, id); }
    catch {status.textContent = "Couldn't save the client ID. Browser storage is unavailable."; return;}
    const oldToken = token;
    clearMail("Settings saved."); oauthClient = null;
    if (oldToken) {try {window.google.accounts.oauth2.revoke(oldToken, () => {});} catch {}}
    settings.open = false; initialize(id);
  });
  function authorize(response, attempt) {
    if (attempt !== authAttempt) return;
    if (response.error || !response.access_token) {status.textContent = "Gmail access wasn't granted. You can try Connect Gmail again."; return;}
    if (!window.google.accounts.oauth2.hasGrantedAllScopes(response, SCOPE)) {
      status.textContent = "Read-only Gmail permission is needed to show previews.";
      window.google.accounts.oauth2.revoke(response.access_token, () => {}); return;
    }
    generation++; activeRequest?.abort(); clearTimeout(expiryTimer);
    messages.replaceChildren(); account.textContent = "";
    token = response.access_token; email = "";
    const lifetime = Number(response.expires_in);
    expiresAt = Date.now() + (Number.isFinite(lifetime) && lifetime > 0 ? lifetime : 3600) * 1000;
    expiryTimer = setTimeout(() => clearMail("Session expired. Reconnect Gmail to see your messages."), Math.max(1, expiresAt - Date.now()));
    connect.hidden = true; disconnect.hidden = false; refresh.disabled = false;
    refreshMail();
  }
  async function gmailGet(path, params, credential, signal) {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/" + path);
    for (const [key, value] of params) url.searchParams.append(key, value);
    const response = await fetch(url, {headers: {Authorization: "Bearer " + credential}, signal, cache: "no-store"});
    if (!response.ok) {
      const error = Error(response.status === 403 ? "Gmail access was blocked. Check that the Gmail API is enabled and your account is an allowed test user. School accounts may require administrator approval." : "Gmail couldn't load. Try Refresh in a moment.");
      error.status = response.status; throw error;
    }
    return response.json();
  }
  async function refreshMail() {
    if (!token) return;
    if (Date.now() >= expiresAt) {clearMail("Session expired. Reconnect Gmail to see your messages."); return;}
    activeRequest?.abort(); const request = new AbortController(); activeRequest = request;
    const version = generation, credential = token;
    refresh.disabled = true; status.textContent = "Loading your messages…";
    const timeout = setTimeout(() => request.abort(), 20000);
    try {
      const filters = {unread: "in:inbox is:unread -category:promotions -category:social", important: "in:inbox is:important is:unread", starred: "in:inbox is:starred"};
      const [profile, listing] = await Promise.all([
        gmailGet("profile", [], credential, request.signal),
        gmailGet("messages", [["q", filters[filter.value]], ["maxResults", "5"]], credential, request.signal),
      ]);
      const rows = await Promise.all((listing.messages || []).map(m => gmailGet("messages/" + encodeURIComponent(m.id), [["format", "metadata"], ["metadataHeaders", "From"], ["metadataHeaders", "Subject"]], credential, request.signal)));
      if (version !== generation || request.signal.aborted) return;
      email = profile.emailAddress; account.textContent = email;
      messages.replaceChildren();
      rows.forEach(message => {
        const headers = message.payload?.headers || [];
        const header = name => headers.find(h => h.name.toLowerCase() === name)?.value || "";
        const a = link("", "https://mail.google.com/mail/?authuser=" + encodeURIComponent(email) + "#inbox/" + encodeURIComponent(message.threadId || message.id), "home-mail");
        a.append(node("span", "home-sender", header("from")), node("strong", "", header("subject") || "(No subject)"), node("span", "home-snippet", message.snippet || ""));
        messages.append(a);
      });
      status.textContent = rows.length ? `${rows.length} shown · Updated ${new Date().toLocaleTimeString([], {hour: "numeric", minute: "2-digit"})}` : "No messages match this filter.";
    } catch (e) {
      if (version !== generation || activeRequest !== request) return;
      if (e.status === 401) clearMail("Session expired. Reconnect Gmail to see your messages.");
      else status.textContent = request.signal.aborted ? "Gmail took too long to respond. Try Refresh." : e.message;
    } finally {
      clearTimeout(timeout);
      if (activeRequest === request) {activeRequest = null; refresh.disabled = !token;}
    }
  }
  filter.addEventListener("change", () => refreshMail());
  setInterval(() => {if (!document.hidden && token) refreshMail();}, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {if (!document.hidden && token) refreshMail();});
  window.addEventListener("pagehide", () => clearMail("Connect Gmail to see your messages."));
  const clientId = read(CLIENT_KEY, "");
  if (typeof clientId === "string" && /^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {clientInput.value = clientId; initialize(clientId);}
})();
