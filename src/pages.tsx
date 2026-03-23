import { Hono } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";
import { html } from "hono/html";

type Bindings = {
  DB: D1Database;
};

const pages = new Hono<{ Bindings: Bindings }>();

const Layout = (props: { children: HtmlEscapedString | Promise<HtmlEscapedString> }) => html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>slink</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
          background: #fafafa;
          color: #1a1a1a;
          line-height: 1.6;
          padding: 2rem 1rem;
        }
        .container {
          max-width: 720px;
          margin: 0 auto;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        h1 {
          font-size: 1.4rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8rem;
        }
        .user-email {
          color: #666;
        }
        form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }
        input {
          font-family: inherit;
          font-size: 0.85rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          outline: none;
        }
        input:focus {
          border-color: #1a1a1a;
        }
        input[name="url"] {
          flex: 1;
        }
        input[name="slug"] {
          width: 120px;
        }
        button {
          font-family: inherit;
          font-size: 0.85rem;
          padding: 0.5rem 1rem;
          border: 1px solid #1a1a1a;
          border-radius: 4px;
          background: #1a1a1a;
          color: #fff;
          cursor: pointer;
        }
        button:hover {
          background: #333;
        }
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
        }
        .btn-outline {
          background: transparent;
          color: #1a1a1a;
        }
        .btn-outline:hover {
          background: #f0f0f0;
        }
        .btn-danger {
          border-color: #c00;
          color: #c00;
          background: transparent;
        }
        .btn-danger:hover {
          background: #fef2f2;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        th {
          text-align: left;
          padding: 0.5rem;
          border-bottom: 2px solid #1a1a1a;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        td {
          padding: 0.5rem;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }
        a {
          color: #1a1a1a;
        }
        .url-cell {
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .actions {
          display: flex;
          gap: 0.25rem;
        }
        .empty {
          text-align: center;
          padding: 3rem 1rem;
          color: #888;
        }
        .error {
          color: #c00;
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        .auth-form {
          max-width: 320px;
          margin: 3rem auto;
        }
        .auth-form form {
          flex-direction: column;
        }
        .auth-form input {
          width: 100%;
        }
        .auth-toggle {
          text-align: center;
          margin-top: 1rem;
          font-size: 0.8rem;
          color: #666;
        }
        .auth-toggle a {
          cursor: pointer;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>slink</h1>
          <div id="user-info" class="user-info" style="display:none">
            <span id="user-email" class="user-email"></span>
            <button class="btn-sm btn-outline" onclick="logout()">Logout</button>
          </div>
        </header>
        <div id="app"></div>
      </div>
      ${props.children}
    </body>
  </html>
`;

const clientScript = html`
  <script>
    const baseUrl = window.location.origin;
    const appEl = document.getElementById("app");
    const userInfoEl = document.getElementById("user-info");
    const userEmailEl = document.getElementById("user-email");

    function timeAgo(dateStr) {
      const seconds = Math.floor((Date.now() - new Date(dateStr + "Z").getTime()) / 1000);
      if (seconds < 60) return seconds + "s ago";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + "m ago";
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + "h ago";
      const days = Math.floor(hours / 24);
      return days + "d ago";
    }

    function renderRow(link) {
      const shortUrl = baseUrl + "/" + link.slug;
      return (
        '<tr data-id="' +
        link.id +
        '">' +
        '<td><a href="' +
        shortUrl +
        '" target="_blank">' +
        link.slug +
        "</a></td>" +
        '<td class="url-cell" title="' +
        link.url +
        '">' +
        link.url +
        "</td>" +
        "<td>" +
        link.clicks +
        "</td>" +
        "<td>" +
        timeAgo(link.created_at) +
        "</td>" +
        '<td class="actions">' +
        '<button class="btn-sm btn-outline" onclick="copyUrl('' +
        shortUrl +
        "')">Copy</button>" +
        '<button class="btn-sm btn-danger" onclick="deleteLink(' +
        link.id +
        ')">Delete</button>' +
        "</td>" +
        "</tr>"
      );
    }

    function renderTable(links) {
      const tbody = document.getElementById("links-body");
      if (links.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="empty">No links yet. Create your first one!</td></tr>';
        return;
      }
      tbody.innerHTML = links.map(renderRow).join("");
    }

    function showDashboard() {
      appEl.innerHTML =
        '<div id="error" class="error"></div>' +
        '<form id="create-form">' +
        '<input name="url" type="url" placeholder="https://example.com" required />' +
        '<input name="slug" type="text" placeholder="slug" />' +
        '<button type="submit">Shorten</button>' +
        "</form>" +
        "<table><thead><tr>" +
        "<th>Short</th><th>Original URL</th><th>Clicks</th><th>Created</th><th></th>" +
        "</tr></thead>" +
        '<tbody id="links-body"><tr><td colspan="5" class="empty">Loading...</td></tr></tbody>' +
        "</table>";

      document.getElementById("create-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("error");
        errorEl.textContent = "";
        const form = e.target;
        const url = form.url.value.trim();
        const slug = form.slug.value.trim();
        const body = { url };
        if (slug) body.slug = slug;

        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          errorEl.textContent = err.error;
          return;
        }

        form.reset();
        loadLinks();
      });

      loadLinks();
    }

    function showAuthForm(mode) {
      const isLogin = mode === "login";
      const title = isLogin ? "Log in" : "Register";
      const toggleText = isLogin ? "Don't have an account? " : "Already have an account? ";
      const toggleLink = isLogin ? "Register" : "Log in";
      const toggleMode = isLogin ? "register" : "login";

      appEl.innerHTML =
        '<div class="auth-form">' +
        '<div id="auth-error" class="error"></div>' +
        '<form id="auth-form">' +
        '<input name="email" type="email" placeholder="email" required />' +
        '<input name="password" type="password" placeholder="password" minlength="8" required />' +
        '<button type="submit">' +
        title +
        "</button>" +
        "</form>" +
        '<div class="auth-toggle">' +
        toggleText +
        '<a onclick="showAuthForm('' +
        toggleMode +
        "')">" +
        toggleLink +
        "</a>" +
        "</div></div>";

      document.getElementById("auth-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("auth-error");
        errorEl.textContent = "";
        const form = e.target;
        const email = form.email.value.trim();
        const password = form.password.value;

        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const err = await res.json();
          errorEl.textContent = err.error;
          return;
        }

        init();
      });
    }

    async function loadLinks() {
      const res = await fetch("/api/links");
      const data = await res.json();
      renderTable(data.links);
    }

    async function deleteLink(id) {
      await fetch("/api/links/" + id, { method: "DELETE" });
      loadLinks();
    }

    async function copyUrl(url) {
      await navigator.clipboard.writeText(url);
    }

    async function logout() {
      await fetch("/api/auth/logout", { method: "POST" });
      userInfoEl.style.display = "none";
      showAuthForm("login");
    }

    async function init() {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.user) {
        userEmailEl.textContent = data.user.email;
        userInfoEl.style.display = "flex";
        showDashboard();
      } else {
        userInfoEl.style.display = "none";
        showAuthForm("login");
      }
    }

    init();
  </script>
`;

pages.get("/", (c) => {
  return c.html(Layout({ children: clientScript }));
});

export { pages };
