import fs from "fs";
import Parser from "rss-parser";

const SOURCES_PATH = new URL("./sources.json", import.meta.url);
const POSTED_PATH = new URL("./posted.json", import.meta.url);
const MAX_POSTS_PER_RUN = 8; // caps how many entries go to Slack in one run

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  throw new Error("SLACK_WEBHOOK_URL is not set");
}

const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
const posted = new Set(JSON.parse(fs.readFileSync(POSTED_PATH, "utf8")));

const parser = new Parser();

async function fetchNewEntries(source) {
  const feed = await parser.parseURL(source.feed_url);
  return feed.items
    .filter((item) => item.link && !posted.has(item.link))
    .map((item) => {
      const publishedAt = item.isoDate ?? item.pubDate;
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
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `*${entry.source}*: <${entry.link}|${entry.title}>`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Slack post failed (${res.status}): ${await res.text()}`);
  }
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
  }

  fs.writeFileSync(POSTED_PATH, JSON.stringify([...posted], null, 2));

  console.log(`Posted ${newEntries.length} new entries.`);
}

main();
