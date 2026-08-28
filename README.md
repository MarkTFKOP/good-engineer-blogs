# Good Engineer Blogs

An open-source bot that watches a curated list of engineering blogs and posts
new entries to Slack—a few at a time, on a schedule, with no server to operate.
The repository also contains a small public homepage that shows what the bot
follows and how to run your own copy.

## Repository layout

```text
fetch-and-post.js               Bot runtime
sources.json                    RSS and Atom sources
posted.json                     Deduplication state committed by the workflow
.github/workflows/
  post-blogs.yml                Runs the bot on a weekday schedule
  deploy-site.yml               Publishes site/ through GitHub Pages
site/                            Static Vite and TypeScript homepage
```

## Run your own bot

1. In Slack, create a workflow using **From a webhook** as its trigger. Add one
   text variable named `message`, then add **Send a message to a channel** and
   use that variable as the message body. Publish the workflow and copy its
   web-request URL.
2. Add that URL to your GitHub repository under **Settings → Secrets and
   variables → Actions** as a repository secret named `SLACK_WEBHOOK_URL`.
3. Edit `sources.json`. Each source uses the existing
   `{ "name", "feed_url" }` shape.
4. Open **Actions → Post engineering blogs to Slack → Run workflow** and verify
   the first batch in your channel before relying on the schedule.

Do not commit or share the Slack webhook URL.

## How it works

- `fetch-and-post.js` fetches all configured RSS and Atom feeds and filters out
  links already recorded in `posted.json`.
- It sorts all unseen entries oldest-first and posts at most eight per run.
  Large archives therefore drain gradually instead of flooding the channel.
- Each successful Slack post is recorded immediately. The workflow commits the
  state even if a later post fails, preventing a partially delivered batch from
  being repeated on the next run.
- A dead feed, invalid publication date, or failed Slack response fails the run
  visibly in GitHub Actions.
- The Slack Workflow Builder payload contains one field named `message`. It
  sends the source name plus a bare URL so Slack can render its native unfurl.

`posted.json` is intentionally not capped. Forgetting old links while a source
still exposes its full archive would eventually cause old posts to be sent
again.

## Schedule

The workflow runs at 9am, 12pm, 3pm, and 6pm IST, Monday through Friday:

```text
30 3,6,9,12 * * 1-5
```

GitHub cron expressions use UTC; IST is UTC+5:30.

## Adding a source with a backlog

Add it directly to `sources.json` and leave `posted.json` unchanged. Its older
entries join the global queue and drain eight at a time. Change
`MAX_POSTS_PER_RUN` in `fetch-and-post.js` if you intentionally want a different
pace.

## Homepage

The static homepage lives in `site/`. It imports the repository's
`sources.json` during the build, keeping the public list aligned with the bot.
Local development requires Node.js 22.12 or newer.

```bash
cd site
npm ci
npm run dev
```

### GitHub Pages

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Push a change under `site/` or run **Deploy site** manually.

The deployment workflow publishes `site/dist` using GitHub's official Pages
actions.

### Custom domain

After choosing the real domain, create `site/public/CNAME` containing only that
hostname. Configure the matching DNS record and enter the same hostname under
**Settings → Pages → Custom domain**. Follow
[GitHub's current custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
for the required records.

## Contributing

Adding a blog is a one-line change to `sources.json`. Please confirm the URL is
a working RSS or Atom feed and mention unusually large archives in the pull
request.

## License

[MIT](./LICENSE) © 2026 Mark Pereira.
