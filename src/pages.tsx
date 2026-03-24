import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export function DashboardPage(): HtmlEscapedString {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Slink — URL Shortener</title>
        <style>
          *,
          *::before,
          *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #fff;
            color: #1a1a1a;
            line-height: 1.5;
            padding: 2rem 1rem;
            max-width: 960px;
            margin: 0 auto;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
          }
          .form-section {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1.25rem;
            margin-bottom: 1.5rem;
          }
          .form-row {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          input[type="text"],
          input[type="url"],
          input[type="datetime-local"] {
            padding: 0.5rem 0.75rem;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 0.875rem;
            outline: none;
          }
          input:focus {
            border-color: #2563eb;
          }
          .input-url {
            flex: 2;
            min-width: 200px;
          }
          .input-slug {
            flex: 1;
            min-width: 120px;
          }
          .input-expires {
            flex: 1;
            min-width: 160px;
          }
          button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            font-size: 0.875rem;
            cursor: pointer;
          }
          .btn-primary {
            background: #2563eb;
            color: #fff;
          }
          .btn-primary:hover {
            background: #1d4ed8;
          }
          .btn-danger {
            background: none;
            color: #dc2626;
            border: 1px solid #dc2626;
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
          .btn-danger:hover {
            background: #fef2f2;
          }
          .message {
            margin-top: 0.75rem;
            font-size: 0.875rem;
            font-family: "SF Mono", "Fira Code", monospace;
          }
          .message a {
            color: #2563eb;
          }
          .message.error {
            color: #dc2626;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }
          th,
          td {
            text-align: left;
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid #e0e0e0;
          }
          th {
            font-weight: 600;
            color: #666;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .url-cell {
            font-family: "SF Mono", "Fira Code", monospace;
            font-size: 0.8125rem;
          }
          .url-cell a {
            color: #2563eb;
            text-decoration: none;
          }
          .url-cell a:hover {
            text-decoration: underline;
          }
          .clicks {
            text-align: center;
          }
          .expired {
            color: #dc2626;
            font-weight: 600;
          }
          .pagination {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            margin-top: 1rem;
          }
          .pagination button {
            background: #f5f5f5;
            color: #1a1a1a;
            border: 1px solid #ccc;
          }
          .pagination button:disabled {
            opacity: 0.4;
            cursor: default;
          }
          .pagination button:not(:disabled):hover {
            background: #e5e5e5;
          }
          .empty {
            text-align: center;
            color: #999;
            padding: 2rem;
          }
          @media (max-width: 640px) {
            .form-row {
              flex-direction: column;
            }
            .hide-mobile {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>Slink — URL Shortener</h1>

        <div class="form-section">
          <form id="create-form" class="form-row">
            <input
              class="input-url"
              type="url"
              name="url"
              placeholder="https://example.com"
              required
            />
            <input class="input-slug" type="text" name="slug" placeholder="custom-slug" />
            <input class="input-expires" type="datetime-local" name="expires_at" />
            <button type="submit" class="btn-primary">Shorten</button>
          </form>
          <div id="create-message" class="message"></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Short URL</th>
              <th>Target URL</th>
              <th class="clicks">Clicks</th>
              <th class="hide-mobile">Expires</th>
              <th class="hide-mobile">Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="links-body"></tbody>
        </table>
        <div id="empty-state" class="empty" style="display:none">No links yet</div>

        <div class="pagination">
          <button id="btn-prev" disabled>Previous</button>
          <span id="page-info"></span>
          <button id="btn-next" disabled>Next</button>
        </div>

        <script>
          const PER_PAGE = 20;
          let currentPage = 1;
          let totalLinks = 0;

          const tbody = document.getElementById("links-body");
          const emptyState = document.getElementById("empty-state");
          const btnPrev = document.getElementById("btn-prev");
          const btnNext = document.getElementById("btn-next");
          const pageInfo = document.getElementById("page-info");
          const form = document.getElementById("create-form");
          const msg = document.getElementById("create-message");

          function baseUrl() {
            return location.origin;
          }

          function truncate(str, len) {
            return str.length > len ? str.slice(0, len) + "…" : str;
          }

          function formatDate(iso) {
            return new Date(iso).toLocaleDateString();
          }

          function formatExpiry(expiresAt) {
            if (!expiresAt) return "Never";
            var now = new Date().toISOString();
            if (expiresAt <= now) return '<span class="expired">Expired</span>';
            return formatDate(expiresAt);
          }

          function renderLinks(links) {
            tbody.innerHTML = "";
            if (links.length === 0) {
              emptyState.style.display = "block";
              return;
            }
            emptyState.style.display = "none";
            links.forEach(function (link) {
              var shortUrl = baseUrl() + "/" + link.slug;
              var tr = document.createElement("tr");
              tr.dataset.id = link.id;
              tr.innerHTML =
                '<td class="url-cell"><a href="' +
                shortUrl +
                '" target="_blank">/' +
                link.slug +
                "</a></td>" +
                '<td class="url-cell" title="' +
                link.url.replace(/"/g, "&quot;") +
                '">' +
                truncate(link.url, 50) +
                "</td>" +
                '<td class="clicks">' +
                link.clicks +
                "</td>" +
                '<td class="hide-mobile">' +
                formatExpiry(link.expires_at) +
                "</td>" +
                '<td class="hide-mobile">' +
                formatDate(link.created_at) +
                "</td>" +
                '<td><button class="btn-danger" onclick="deleteLink(' +
                link.id +
                ')">Delete</button></td>';
              tbody.appendChild(tr);
            });
          }

          function updatePagination() {
            var totalPages = Math.max(1, Math.ceil(totalLinks / PER_PAGE));
            btnPrev.disabled = currentPage <= 1;
            btnNext.disabled = currentPage >= totalPages;
            pageInfo.textContent = currentPage + " / " + totalPages;
          }

          function fetchLinks() {
            fetch("/api/links?page=" + currentPage + "&per_page=" + PER_PAGE)
              .then(function (r) {
                return r.json();
              })
              .then(function (data) {
                totalLinks = data.total;
                renderLinks(data.links);
                updatePagination();
              });
          }

          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var urlVal = form.url.value.trim();
            var slugVal = form.slug.value.trim();
            var expiresVal = form.expires_at.value;
            var body = { url: urlVal };
            if (slugVal) body.slug = slugVal;
            if (expiresVal) body.expires_at = new Date(expiresVal).toISOString();

            msg.innerHTML = "";
            msg.className = "message";

            fetch("/api/links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
              .then(function (r) {
                return r.json().then(function (d) {
                  return { ok: r.ok, data: d };
                });
              })
              .then(function (res) {
                if (!res.ok) {
                  msg.textContent = res.data.error;
                  msg.className = "message error";
                  return;
                }
                var shortUrl = baseUrl() + "/" + res.data.slug;
                msg.innerHTML =
                  'Created: <a href="' + shortUrl + '" target="_blank">' + shortUrl + "</a>";
                form.reset();
                currentPage = 1;
                fetchLinks();
              });
          });

          window.deleteLink = function (id) {
            fetch("/api/links/" + id, { method: "DELETE" }).then(function () {
              fetchLinks();
            });
          };

          btnPrev.addEventListener("click", function () {
            if (currentPage > 1) {
              currentPage--;
              fetchLinks();
            }
          });
          btnNext.addEventListener("click", function () {
            currentPage++;
            fetchLinks();
          });

          fetchLinks();
        </script>
      </body>
    </html>` as unknown as HtmlEscapedString;
}
