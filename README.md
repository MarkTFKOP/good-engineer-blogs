# Good Engineer (Blogs)

Posts new engineering blog entries to a Slack channel via Incoming Webhook,
on a GitHub Actions cron schedule.

## Setup

1. Create a new GitHub repo (private is fine) and push these files.
2. Repo Settings -> Secrets and variables -> Actions -> New repository secret.
   Name it `SLACK_WEBHOOK_URL`, paste the webhook URL you already have.
3. Edit `sources.json` to add your own links, same `{ "name", "feed_url" }` shape.
4. Actions tab -> "Post engineering blogs to Slack" -> Run workflow, to test
   without waiting for the schedule. Check the channel and the run log.

## Adjusting the schedule

The cron line in `.github/workflows/post-blogs.yml` runs at 9am, 12pm, 3pm,
and 6pm IST, Mon-Fri. GitHub cron is UTC-only, so IST times are pre-converted
(UTC+5:30). To add a 9pm IST run, append `,15` to the hour list and adjust
the minute accordingly: `30 3,6,9,12,15 * * 1-5`.

## How it works

- `fetch-and-post.js` reads `sources.json`, pulls each RSS/Atom feed, and
  collects any entry whose link isn't already in `posted.json`.
- All unposted entries across all sources are sorted oldest-first and capped
  at `MAX_POSTS_PER_RUN` (default 8). Only that batch gets posted this run —
  the rest stay unposted and get picked up again next run.
- After a successful run, it writes the updated `posted.json` back to disk.
  The workflow commits that file so later runs skip those links.
- If a feed URL is dead or a Slack post fails, the run fails outright and
  shows in the Actions log — no silent fallback, no partial retry logic.

The source list contains only currently working RSS or Atom endpoints. Uber
Engineering and Shopify Engineering are not included because their previous
feed URLs no longer serve feeds.

## Adding a source with an existing backlog

Just add it to `sources.json` — don't seed `posted.json`. The oldest-first
cap means a large backlog (e.g. a blog with 100+ existing posts) drains a
few entries per run instead of flooding the channel or getting silently
skipped. Raise `MAX_POSTS_PER_RUN` if you want it to catch up faster.
