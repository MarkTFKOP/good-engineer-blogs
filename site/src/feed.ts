import "./style.css";

interface PostedRecord {
  link: string;
  title: string | null;
  source: string | null;
  publishedAt: string | null;
}

interface PublishedRecord extends PostedRecord {
  title: string;
  source: string;
  publishedAt: string;
}

const FEED_URL =
  "https://raw.githubusercontent.com/MarkTFKOP/good-engineer-blogs/main/posted.json?schema=2";
const PAGE_SIZE = 24;

const app = requireElement<HTMLDivElement>("#feed-app");

app.innerHTML = `
  <div class="feed-shell">
    <nav class="feed-nav" aria-label="Primary navigation">
      <a class="feed-brand" href="./"><span aria-hidden="true">&gt;_</span> Good Engineer Blogs</a>
      <a class="feed-nav-link" href="https://github.com/MarkTFKOP/good-engineer-blogs" target="_blank" rel="noreferrer">GitHub</a>
    </nav>

    <header class="feed-header">
      <p class="eyebrow"><span aria-hidden="true">#</span> live delivery log</p>
      <h1>Every post,<br>ready to read.</h1>
      <p>Engineering writing sent by the bot, collected here newest first.</p>
    </header>

    <main class="feed-main">
      <div class="feed-toolbar">
        <h2>Delivered posts</h2>
        <p id="feed-count" aria-live="polite">Loading…</p>
      </div>
      <p class="feed-state" id="feed-state" role="status">Fetching the latest delivery history…</p>
      <ol class="feed-list" id="feed-list"></ol>
      <button class="btn btn-ghost load-more" id="load-more" type="button" hidden>Load more</button>
    </main>

    <footer class="footer">
      <p><a href="./">← Back to Good Engineer Blogs</a></p>
    </footer>
  </div>
`;

const count = requireElement<HTMLParagraphElement>("#feed-count");
const state = requireElement<HTMLParagraphElement>("#feed-state");
const list = requireElement<HTMLOListElement>("#feed-list");
const loadMore = requireElement<HTMLButtonElement>("#load-more");

let records: PublishedRecord[] = [];
let visibleCount = 0;

loadMore.addEventListener("click", () => {
  visibleCount = Math.min(visibleCount + PAGE_SIZE, records.length);
  renderRecords();
});

loadFeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  state.className = "feed-state feed-state-error";
  state.textContent = `The feed could not be loaded. ${message}`;
  count.textContent = "Unavailable";
  loadMore.hidden = true;
  throw error;
});

async function loadFeed() {
  const response = await fetch(FEED_URL);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  const parsed: unknown = await response.json();
  records = parseRecords(parsed)
    .filter((record): record is PublishedRecord => record.title !== null)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  if (records.length === 0) {
    state.textContent = "No readable posts yet. New deliveries will appear here automatically.";
    count.textContent = "0 posts";
    return;
  }

  state.hidden = true;
  visibleCount = Math.min(PAGE_SIZE, records.length);
  renderRecords();
}

function parseRecords(value: unknown): PostedRecord[] {
  if (!Array.isArray(value)) {
    throw new Error("Feed data is not an array.");
  }

  return value.map((record, index) => {
    if (!record || typeof record !== "object") {
      throw new Error(`Feed record ${index + 1} is invalid.`);
    }

    const { link, title, source, publishedAt } = record as Record<string, unknown>;
    if (
      typeof link !== "string" ||
      (typeof title !== "string" && title !== null) ||
      (typeof source !== "string" && source !== null) ||
      (typeof publishedAt !== "string" && publishedAt !== null)
    ) {
      throw new Error(`Feed record ${index + 1} has an invalid shape.`);
    }

    const url = new URL(link);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`Feed record ${index + 1} has an unsupported URL.`);
    }

    if (title !== null) {
      if (source === null || publishedAt === null || Number.isNaN(Date.parse(publishedAt))) {
        throw new Error(`Feed record ${index + 1} has incomplete metadata.`);
      }
    }

    return { link, title, source, publishedAt };
  });
}

function renderRecords() {
  list.replaceChildren(...records.slice(0, visibleCount).map(createRecord));
  count.textContent = `Showing ${visibleCount} of ${records.length}`;
  loadMore.hidden = visibleCount >= records.length;
}

function createRecord(record: PublishedRecord): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "feed-item";

  const meta = document.createElement("div");
  meta.className = "feed-item-meta";

  const source = document.createElement("span");
  source.className = "feed-source";
  source.textContent = `#${record.source}`;

  const publishedAt = document.createElement("time");
  publishedAt.dateTime = record.publishedAt;
  publishedAt.textContent = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(record.publishedAt));

  const link = document.createElement("a");
  link.href = record.link;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = record.title;

  meta.append(source, publishedAt);
  item.append(meta, link);
  return item;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
