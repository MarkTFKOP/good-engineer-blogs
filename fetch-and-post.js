import fs from "fs";
import Parser from "rss-parser";

const SOURCES_PATH = new URL("./sources.json", import.meta.url);
const POSTED_PATH = new URL("./posted.json", import.meta.url);
const MAX_POSTS_PER_RUN = 8; // caps how many entries go to Slack in one run
const SLACK_POST_TIMEOUT_MS = 30_000;

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  throw new Error("SLACK_WEBHOOK_URL is not set");
}

const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
const records = JSON.parse(fs.readFileSync(POSTED_PATH, "utf8")).map((record) =>
  typeof record === "string"
    ? { link: record, title: null, source: null, publishedAt: null }
    : record,
);
const posted = new Set(records.map((record) => record.link));

const parser = new Parser();

async function fetchNewEntries(source) {
  console.log(`Fetching ${source.name}.`);
  const feed = await parser.parseURL(source.feed_url);
  console.log(`Fetched ${source.name}: ${feed.items.length} entries.`);
  return feed.items
    .filter((item) => item.link && !posted.has(item.link))
    .map((item) => {
      const publishedAt = item.isoDate ?? item.pubDate;
      if (!item.title) {
        throw new Error(`Missing title for ${item.link}`);
      }
      if (!publishedAt || Number.isNaN(Date.parse(publishedAt))) {
        throw new Error(`Invalid publication date for ${item.link}`);
      }

      return {
        source: source.name,
        title: item.title,
        link: item.link,
        publishedAt,
      };
    });
}

async function postToSlack(entry) {
  console.log(`Posting ${entry.link}.`);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(SLACK_POST_TIMEOUT_MS),
    body: JSON.stringify({
      message: `*${entry.source}*: ${entry.link}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Slack post failed (${res.status}): ${await res.text()}`);
  }
  console.log(`Posted ${entry.link}.`);
}

async function main() {
  const results = await Promise.all(sources.map(fetchNewEntries));
  const newEntries = results
    .flat()
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
    .slice(0, MAX_POSTS_PER_RUN);

  for (const entry of newEntries) {
    await postToSlack(entry);
    posted.add(entry.link);
    records.push(entry);
    fs.writeFileSync(POSTED_PATH, JSON.stringify(records, null, 2));
  }

  console.log(`Posted ${newEntries.length} new entries.`);
}

main();
