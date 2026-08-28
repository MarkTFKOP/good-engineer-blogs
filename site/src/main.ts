import "./style.css";
import sources from "../../sources.json";

interface Source {
  name: string;
  feed_url: string;
}

const typedSources = sources as Source[];

const logLines = [
  "$ 12:00 IST · cron trigger",
  `→ scanning ${typedSources.length} sources for unseen posts`,
  "→ unseen entries sorted oldest-first",
  "→ selected 8 posts for this run",
  '→ next: "Making HTTP Requests Using Netcat"',
  "→ posted → #good-engineer-blogs",
  '→ next: "Fast and Efficient Pagination in MongoDB"',
  "→ posted → #good-engineer-blogs",
  "→ remaining backlog stays queued for the next run",
];

const howItWorks = [
  {
    title: "Watches sources",
    body: "Reads RSS and Atom feeds from a curated list of engineering blogs, checked on a schedule.",
  },
  {
    title: "Finds what's unseen",
    body: "Compares every entry with the durable link history before adding it to the queue.",
  },
  {
    title: "Paces itself",
    body: "Posts eight per run, oldest first, so a large archive never floods the channel.",
  },
  {
    title: "Delivers to Slack",
    body: "Sends through a Slack workflow webhook—no server, database, or process to keep running.",
  },
];

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sourceOrigin(feedUrl: string): string {
  const url = new URL(feedUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported feed URL protocol: ${url.protocol}`);
  }
  return url.origin;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app root");

app.innerHTML = `
  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><span aria-hidden="true">&gt;_</span> open source · runs on GitHub Actions</p>
      <h1>Good engineering writing finds you.<br>Nobody has to go looking.</h1>
      <p class="lede">
        Good Engineer Blogs watches trusted engineering blogs, finds unseen posts,
        and drops them into Slack—a few at a time, on a schedule.
      </p>
      <div class="cta-row">
        <a class="btn btn-primary" href="./feed.html">Read the feed</a>
        <a class="btn btn-ghost" href="#run-your-own">Run your own</a>
        <a class="btn btn-ghost" href="https://github.com/MarkTFKOP/good-engineer-blogs" target="_blank" rel="noreferrer">View on GitHub</a>
      </div>
    </div>
    <div class="terminal" role="img" aria-label="Simulated log of the bot posting engineering articles to Slack">
      <div class="terminal-bar"><span aria-hidden="true" class="status-dot"></span> cron — good-engineer-blogs</div>
      <div class="terminal-body" id="terminal-body"></div>
    </div>
  </header>

  <main>
    <section class="how">
      <h2>How it works</h2>
      <ol class="how-list">
        ${howItWorks
          .map(
            (step, index) => `
          <li class="how-step">
            <span class="how-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>${step.title}</h3>
              <p>${step.body}</p>
            </div>
          </li>
        `,
          )
          .join("")}
      </ol>
    </section>

    <section class="sources">
      <h2>Sources it follows</h2>
      <p class="sources-sub">${typedSources.length} blogs today. Add your own with a one-line pull request.</p>
      <div class="source-grid">
        ${typedSources
          .map(
            (source) => `
          <a class="source-pill" href="${escapeHtml(sourceOrigin(source.feed_url))}" target="_blank" rel="noreferrer">
            <span class="hash">#</span>${escapeHtml(slugify(source.name))}
          </a>
        `,
          )
          .join("")}
      </div>
    </section>

    <section class="run" id="run-your-own">
      <h2>Run your own</h2>
      <p>
        The complete system is one script, one JSON source list, and two GitHub workflows.
        No server, no database, and no hosting bill.
      </p>
      <pre class="code-block"><code>git clone https://github.com/MarkTFKOP/good-engineer-blogs
cd good-engineer-blogs
# add your Slack workflow URL as a secret, then push</code></pre>
      <a class="btn btn-primary" href="https://github.com/MarkTFKOP/good-engineer-blogs#readme" target="_blank" rel="noreferrer">Full setup guide →</a>
    </section>
  </main>

  <footer class="footer">
    <p>MIT licensed. Built with Vite. <a href="https://github.com/MarkTFKOP/good-engineer-blogs" target="_blank" rel="noreferrer">Source on GitHub</a></p>
  </footer>
`;

const terminalBody = document.querySelector<HTMLDivElement>("#terminal-body");
if (!terminalBody) throw new Error("Missing terminal log root");
runTerminalLog(terminalBody, logLines);

function runTerminalLog(element: HTMLDivElement, lines: string[]) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    element.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    return;
  }

  let lineIndex = 0;

  function renderNextLine() {
    if (lineIndex >= lines.length) {
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      element.appendChild(cursor);
      return;
    }

    const paragraph = document.createElement("p");
    element.appendChild(paragraph);
    typeLine(paragraph, lines[lineIndex], () => {
      lineIndex += 1;
      window.setTimeout(renderNextLine, 260);
    });
  }

  function typeLine(target: HTMLParagraphElement, text: string, done: () => void) {
    let characterIndex = 0;
    const interval = window.setInterval(() => {
      target.textContent = text.slice(0, characterIndex + 1);
      characterIndex += 1;
      if (characterIndex >= text.length) {
        window.clearInterval(interval);
        done();
      }
    }, 18);
  }

  renderNextLine();
}
