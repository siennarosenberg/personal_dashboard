// Load this file AFTER app.js.
(() => {
  "use strict";

  if (document.getElementById("home-search")) return;

  // ---------- Helpers ----------
  function node(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function store(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function websiteUrl(value) {
    const text = value.trim();

    const address = /^[a-z][a-z\d+.-]*:/i.test(text)
      ? text
      : "https://" + text;

    const url = new URL(address);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Use an http or https website address.");
    }

    return url.href;
  }

  // ---------- Styling ----------
  const style = node("style");

  style.textContent = `
    .home-search {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      max-width: 760px;
      margin: 0 auto 1.5rem;
      padding: 0.55rem 0.6rem 0.55rem 1.1rem;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 999px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .home-search input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: 0;
      color: var(--ink);
      font: inherit;
      padding: 0.45rem;
    }

    .home-search input:focus {
      outline: none;
    }

    .home-search:focus-within {
      outline: 2px solid var(--accent);
    }

    .home-search button {
      border: 0;
      background: var(--accent);
      color: white;
      border-radius: 999px;
      padding: 0.6rem 1rem;
      font: inherit;
      cursor: pointer;
    }

    .home-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.8rem;
    }

    .home-bookmark {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
      max-width: 100%;
      padding: 0.5rem 0.6rem;
      background: rgba(255, 255, 255, 0.45);
      border: 1px solid var(--line);
      border-radius: 12px;
    }

    .home-bookmark a {
      color: var(--ink);
      text-decoration: none;
      overflow-wrap: anywhere;
    }

    .home-bookmark a:hover {
      color: var(--accent);
    }

    .home-remove {
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
    }

    .home-bookmarks details {
      margin-top: 0.8rem;
    }

    .home-bookmarks summary {
      cursor: pointer;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .home-bookmarks .add {
      margin-top: 0.6rem;
      flex-wrap: wrap;
    }

    .home-bookmarks .add input[type="text"] {
      flex: 1 1 130px;
      min-width: 0;
      width: 100%;
    }

    .home-bookmarks .add button {
      width: auto;
      min-width: 2.3rem;
      padding: 0.4rem 0.65rem;
    }

    .home-status {
      min-height: 1.2em;
      color: var(--muted);
      font-size: 0.82rem;
      overflow-wrap: anywhere;
    }

    .top-right {
      flex-wrap: wrap;
    }

    @media (max-width: 480px) {
      .home-search {
        border-radius: 18px;
      }

      .home-search button {
        padding: 0.55rem 0.7rem;
      }
    }
  `;

  document.head.appendChild(style);

  // ---------- Google search ----------
  const search = node("form", "home-search");
  search.id = "home-search";
  search.action = "https://www.google.com/search";
  search.method = "GET";

  // Both Enter and the Search button open a new tab.
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

  const header = document.querySelector(".top");

  if (header) {
    header.after(search);
  } else {
    document.querySelector("main")?.prepend(search);
  }

  // ---------- Saved bookmarks ----------
  const BOOKMARK_KEY = "homepage-bookmarks";
  const GMAIL_ADDED_KEY = "homepage-gmail-bookmark-added";

  function validBookmarks(rows) {
    return (
      Array.isArray(rows) &&
      rows.length <= 100 &&
      rows.every((bookmark) => {
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
      const alreadyHasGmail = bookmarks.some(
        (bookmark) =>
          new URL(bookmark.url).hostname === "mail.google.com"
      );

      if (!alreadyHasGmail && bookmarks.length < 100) {
        const next = [
          ...bookmarks,
          {
            name: "Gmail",
            url: "https://mail.google.com/",
          },
        ];

        store(BOOKMARK_KEY, next);
        bookmarks = next;
      }

      store(GMAIL_ADDED_KEY, true);
    } catch {
      // Existing bookmarks still work if storage is unavailable.
    }
  }

  // ---------- Bookmark card ----------
  const card = node("section", "card home-bookmarks");
  card.setAttribute("aria-labelledby", "home-bookmarks-title");

  const cardHead = node("div", "card-head");
  const heading = node("h2", "", "Bookmarks");
  heading.id = "home-bookmarks-title";
  cardHead.appendChild(heading);

  const bookmarkList = node("div", "home-links");

  const status = node("p", "home-status");
  status.setAttribute("role", "status");

  const details = node("details");
  details.appendChild(node("summary", "", "Add a bookmark"));

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

  card.append(cardHead, bookmarkList, details, status);

  const leftColumn = document.querySelector(".col-left");

  if (leftColumn) {
    leftColumn.prepend(card);
  } else {
    document.querySelector("main")?.appendChild(card);
  }

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
            "Couldn't save. Browser storage may be full or unavailable.";
        }
      });

      wrap.append(anchor, remove);
      bookmarkList.appendChild(wrap);
    });
  }

  form.addEventListener("submit", (event) => {
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

  // ---------- Include bookmarks in dashboard backups ----------
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

      const validated = originalValidator({
        ...backup,
        data,
      });

      return rows === undefined
        ? validated
        : {
            ...validated,
            [BOOKMARK_KEY]: rows,
          };
    };
  }
})();
