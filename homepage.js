(() => {
  "use strict";

  if (window.__dashboardHomepageLayout3) return;
  window.__dashboardHomepageLayout3 = true;

  // Remove controls from older versions.
  document.getElementById("home-gmail-title")
    ?.closest("section")?.remove();

  document.getElementById("home-search")?.remove();

  document.getElementById("home-bookmarks-title")
    ?.closest("section")?.remove();

  document.querySelectorAll(".home-bookmarks")
    .forEach(element => element.remove());

  // ---------- Helpers ----------
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function store(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function websiteUrl(value) {
    const text = value.trim();
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(text)
        ? text
        : "https://" + text
    );

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Use an http or https website address.");
    }

    return url.href;
  }

  // ---------- Styling ----------
  const style = node("style");

  style.textContent = `
    .top {
      margin-bottom: 1rem;
    }

    .top-right {
      flex-wrap: wrap;
    }

    .home-search {
      display: flex;
      align-items: center;
      gap: .65rem;
      width: 100%;
      max-width: none;
      margin: 0 0 1.5rem;
      padding: .55rem .6rem .55rem 1.1rem;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 999px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .home-search input {
      flex: 1;
      min-width: 0;
      padding: .45rem;
      background: transparent;
      border: 0;
      color: var(--ink);
      font: inherit;
    }

    .home-search input:focus {
      outline: none;
    }

    .home-search:focus-within {
      outline: 2px solid var(--accent);
    }

    .home-search button {
      padding: .6rem 1rem;
      background: var(--accent);
      border: 0;
      border-radius: 999px;
      color: white;
      font: inherit;
      cursor: pointer;
    }

    .home-bookmarks {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .65rem;
      position: relative;
      min-width: 0;
      margin: 0 0 .8rem;
    }

    .home-links {
      display: flex;
      flex: 1 1 0;
      flex-wrap: nowrap;
      align-items: center;
      gap: .5rem;
      min-width: 0;
      overflow-x: auto;
      padding: .25rem 0;
      scrollbar-width: thin;
    }

    .home-bookmark {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: .4rem;
      min-width: 0;
      max-width: 220px;
      padding: .3rem .55rem;
      background: rgba(255,255,255,.45);
      border: 1px solid var(--line);
      border-radius: 12px;
    }

    .home-bookmark a {
      overflow: hidden;
      color: var(--ink);
      font-size: .88rem;
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .home-bookmark a:hover {
      color: var(--accent);
    }

    .home-remove {
      padding: .2rem .4rem;
      background: transparent;
      border: 0;
      color: var(--muted);
      font-size: 1.1rem;
      cursor: pointer;
    }

    .home-bookmarks details {
      position: relative;
      flex: none;
    }

    .home-bookmarks summary {
      padding: .4rem .7rem;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      color: var(--ink);
      font-size: .85rem;
      list-style: none;
      white-space: nowrap;
      cursor: pointer;
    }

    .home-bookmarks summary::-webkit-details-marker {
      display: none;
    }

    .home-bookmarks .add {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 30;
      flex-wrap: wrap;
      width: 320px;
      max-width: calc(100vw - 3rem);
      min-width: 0;
      margin-top: .6rem;
      padding: 1rem;
      background: var(--bg-b);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 8px 25px rgba(0,0,0,.12);
    }

    .home-bookmarks .add input[type="text"] {
      flex: 1 1 130px;
      width: 100%;
      min-width: 0;
    }

    .home-bookmarks .add button {
      width: auto;
      min-width: 2.3rem;
      padding: .4rem .65rem;
    }

    .home-status {
      min-height: 1.2em;
      color: var(--muted);
      font-size: .82rem;
      overflow-wrap: anywhere;
    }

    .home-bookmarks > .home-status {
      flex-basis: 100%;
      margin: 0;
    }

    .home-bookmarks > .home-status:empty {
      display: none;
    }

    .home-central-todo .add {
      flex-wrap: wrap;
    }

    .home-central-todo .add input[type="text"] {
      flex: 1 1 8rem;
      min-width: 0;
    }

    .home-central-todo .list {
      max-height: 16rem;
      overflow-y: auto;
    }

    @media (max-width: 480px) {
      .home-search {
        border-radius: 18px;
      }

      .home-search button {
        padding: .55rem .7rem;
      }
    }
  `;

  document.head.appendChild(style);

  // ---------- Google search ----------
  const search = node("form", "home-search");
  search.id = "home-search";
  search.action = "https://www.google.com/search";
  search.method = "GET";
  search.target = "_blank";
  search.setAttribute("rel", "noopener noreferrer");
  search.setAttribute("role", "search");

  const query = node("input");
  query.type = "search";
  query.name = "q";
  query.placeholder = "Search Google…";
  query.required = true;
  query.setAttribute("aria-label", "Search Google");

  const searchButton = node("button", "", "Search");
  searchButton.type = "submit";

  search.append(query, searchButton);
  document.querySelector(".top").after(search);

  // ---------- Bookmarks ----------
  const BOOKMARK_KEY = "homepage-bookmarks";
  const GMAIL_ADDED_KEY = "homepage-gmail-bookmark-added";

  function validBookmarks(rows) {
    return (
      Array.isArray(rows) &&
      rows.length <= 100 &&
      rows.every(bookmark => {
        if (
          !bookmark ||
          typeof bookmark !== "object" ||
          typeof bookmark.name !== "string" ||
          typeof bookmark.url !== "string" ||
          !bookmark.name.trim() ||
          bookmark.name.length > 80 ||
          bookmark.url.length > 2048
        ) {
          return false;
        }

        try {
          return (
            /^https?:\/\//i.test(bookmark.url) &&
            Boolean(websiteUrl(bookmark.url))
          );
        } catch {
          return false;
        }
      })
    );
  }

  let bookmarks = read(BOOKMARK_KEY, []);

  if (!validBookmarks(bookmarks)) {
    bookmarks = [];
  }

  // Add a regular Gmail bookmark once.
  if (!read(GMAIL_ADDED_KEY, false)) {
    try {
      const hasGmail = bookmarks.some(
        bookmark =>
          new URL(bookmark.url).hostname === "mail.google.com"
      );

      if (!hasGmail && bookmarks.length < 100) {
        const next = [
          ...bookmarks,
          { name: "Gmail", url: "https://mail.google.com/" },
        ];

        store(BOOKMARK_KEY, next);
        bookmarks = next;
      }

      store(GMAIL_ADDED_KEY, true);
    } catch {
      // Keep existing bookmarks if storage is unavailable.
    }
  }

  // ---------- Horizontal bookmarks bar ----------
  const bookmarkBar = node("nav", "home-bookmarks");
  bookmarkBar.setAttribute("aria-label", "Bookmarks");

  const bookmarkList = node("div", "home-links");

  const status = node("p", "home-status");
  status.setAttribute("role", "status");

  const details = node("details");
  details.appendChild(node("summary", "", "+ Bookmark"));

  const form = node("form", "add");

  const nameInput = node("input");
  nameInput.type = "text";
  nameInput.placeholder = "Name";
  nameInput.maxLength = 80;
  nameInput.required = true;
  nameInput.setAttribute("aria-label", "Bookmark name");

  const addressInput = node("input");
  addressInput.type = "text";
  addressInput.placeholder = "example.com";
  addressInput.maxLength = 2048;
  addressInput.required = true;
  addressInput.setAttribute("aria-label", "Website address");

  const addButton = node("button", "", "+");
  addButton.type = "submit";
  addButton.setAttribute("aria-label", "Save bookmark");

  form.append(nameInput, addressInput, addButton);
  details.appendChild(form);

  bookmarkBar.append(bookmarkList, details, status);

  // Put bookmarks immediately above Google search.
  search.before(bookmarkBar);

  function renderBookmarks() {
    bookmarkList.replaceChildren();

    if (!bookmarks.length) {
      bookmarkList.appendChild(
        node("span", "home-status", "Keep your favorite sites here.")
      );
    }

    bookmarks.forEach((bookmark, index) => {
      const wrap = node("div", "home-bookmark");

      const anchor = node("a", "", bookmark.name);
      anchor.href = bookmark.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";

      const remove = node("button", "home-remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + bookmark.name);

      remove.addEventListener("click", () => {
        const next = bookmarks.filter(
          (_, bookmarkIndex) => bookmarkIndex !== index
        );

        try {
          store(BOOKMARK_KEY, next);
          bookmarks = next;
          renderBookmarks();
          status.textContent = "";
        } catch {
          status.textContent =
            "Couldn't save. Browser storage may be unavailable.";
        }
      });

      wrap.append(anchor, remove);
      bookmarkList.appendChild(wrap);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    try {
      if (bookmarks.length >= 100) {
        throw new Error("You can save up to 100 bookmarks.");
      }

      const next = [
        ...bookmarks,
        {
          name: nameInput.value.trim(),
          url: websiteUrl(addressInput.value),
        },
      ];

      if (!validBookmarks(next)) {
        throw new Error("Enter a name and a valid website address.");
      }

      store(BOOKMARK_KEY, next);
      bookmarks = next;
      renderBookmarks();

      form.reset();
      details.open = false;
      status.textContent = "Bookmark saved.";
    } catch (error) {
      status.textContent = error.message;
    }
  });

  renderBookmarks();

  // ---------- Bookmark backups ----------
  if (
    typeof BACKUP_KEYS !== "undefined" &&
    typeof window.validateBackup === "function"
  ) {
    if (!BACKUP_KEYS.includes(BOOKMARK_KEY)) {
      BACKUP_KEYS.push(BOOKMARK_KEY);
    }

    const originalValidator = window.validateBackup;

    window.validateBackup = function (backup) {
      const rows = backup?.data?.[BOOKMARK_KEY];

      if (rows !== undefined && !validBookmarks(rows)) {
        throw new Error("Invalid bookmarks in backup.");
      }

      const data = { ...backup?.data };
      delete data[BOOKMARK_KEY];

      const validated = originalValidator({ ...backup, data });

      return rows === undefined
        ? validated
        : { ...validated, [BOOKMARK_KEY]: rows };
    };
  }

  // ---------- Swap To-do and Next trip ----------
  // Moving the existing cards preserves their event handlers.
  const todo = document.getElementById("todo-h")
    ?.closest("section");

  const trip = document.getElementById("trip-h")
    ?.closest("section");

  if (todo && trip) {
    const placeholder = node("span");
    placeholder.hidden = true;

    trip.replaceWith(placeholder);
    todo.replaceWith(trip);
    placeholder.replaceWith(todo);

    todo.classList.add("home-central-todo");
  }
})();
