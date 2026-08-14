# Good Engineer (Blogs)

Posts new engineering blog entries to a Slack channel through an Incoming
Webhook on a GitHub Actions cron schedule.

## Setup

1. Create a GitHub repository and push this project.
2. In the repository, go to **Settings → Secrets and variables → Actions** and
   create a repository secret named `SLACK_WEBHOOK_URL` containing the Incoming
   Webhook URL.
3. Edit `sources.json` to add or remove feeds using the existing
   `{ "name", "feed_url" }` shape.
4. In the **Actions** tab, open **Post engineering blogs to Slack** and select
   **Run workflow** to test it without waiting for the schedule.

Do not commit the Slack webhook URL. The application only receives it from the
GitHub Actions secret at runtime.

Because `posted.json` starts empty, the first run posts every item currently
returned by the configured feeds. Use a test channel for that initial run if
you do not want those entries sent to the final channel.

## Schedule

The workflow runs at 9am, 12pm, 3pm, and 6pm IST, Monday through Friday. GitHub
cron schedules use UTC, so those times are represented by:

```yaml
30 3,6,9,12 * * 1-5
```

To include a 9pm IST run, add hour `15`:

```yaml
30 3,6,9,12,15 * * 1-5
```

## How it works

- `fetch-and-post.js` reads `sources.json`, fetches each RSS or Atom feed, and
  posts entries whose links are not already in `posted.json`.
- After posting, it writes the updated state to `posted.json`. The workflow
  commits that file so later runs do not repost the same links.
- A dead feed or failed Slack post fails the run and leaves evidence in the
  Actions log; there is no silent fallback or partial retry path.
