---
name: ojcp-job-search
description: Help a person find job openings by searching the job sources listed in the OJCP registry (ojcp.dev). Use when someone asks for help finding a job, wants openings matching a role, place, pay or remote preference, or asks about a specific posting from those results.
---

# Job search with OJCP

You are helping a person look for work. The Open Job Context Protocol (OJCP) is an open standard that job boards and employers use to publish openings for AI assistants. The public registry at `https://ojcp.dev/api/registry` lists the sources that support it. This skill searches all of them at once and returns real, current openings with links to apply.

Be clear with the person about coverage: these are the job sources that support OJCP so far, not every job on the internet.

## 1. Understand what they want

Before searching, make sure you know:

- **The role**: a job title, kind of work or skills ("data analyst", "night-shift RN", "React developer").
- **Where**: a city and state or region, or remote. Ask if it's unclear.
- **Anything that rules a job out**: minimum pay, full-time versus part-time, on-site versus hybrid versus remote.

Ask one short question if something important is missing. Don't interview them. Never ask for their name, email, phone, resume or other personal details to search: searching doesn't need them.

## 2. Search

Run the helper. It needs Node 18 or newer and has no dependencies:

```bash
node scripts/ojcp-search.mjs "data analyst" --city Chicago --state IL --limit 5
node scripts/ojcp-search.mjs "data analyst" --remote --limit 5
```

Options: `--city`, `--state` (two-letter US state or region), `--country` (ISO code like `US`), `--remote` (include remote roles), and `--limit` (results per source, default 5).

Only the search words and location filters are sent to the job sources. Nothing about the person is sent.

The output is JSON:

- `sources`: each source that was searched and whether it answered. Mention a source that failed only if the person would care.
- `jobs`: one entry per opening, with `source`, `ojcp_id`, `title`, `employer`, `location`, `remote_policy`, `pay`, `posted`, `apply_url` and `agent_can_apply`.

  `location_filter_ignored: true` means that source couldn't filter by place, so check the location yourself and drop jobs that don't fit.

If no tool can run commands, say so, and point the person to `https://ojcp.dev/registry`. There they can open a source and search it directly.

## 3. Show results the person can act on

- Filter out what plainly doesn't fit what they told you (wrong place, pay below their floor, on-site when they want remote). Say briefly what you filtered and why.
- Merge duplicates. The same opening can appear on more than one source; show it once.
- For each job, give title, employer, location or remote, pay if stated, how recent it is, the source, and the apply link. Write "pay not listed" rather than guessing.
- Order by fit with what they asked for, then by most recent.
- Keep it short: five to ten good matches beat thirty weak ones. Offer to search more or widen the search.
- Never invent jobs, employers, pay or links. Only show what the helper returned.

## 4. Go deeper on one job

When they want details on a posting, fetch it:

```bash
node scripts/ojcp-search.mjs --detail <source> <ojcp_id>
```

Summarize what matters to a candidate: duties, requirements, pay, schedule, location, benefits if given. Give an honest read of how well it matches what they've told you, including gaps.

## 5. Applying

- By default, give them the `apply_url` and let them apply themselves. That's where most applications happen today.
- Only consider applying on their behalf when `agent_can_apply` is true and you have a tool that can do it. Even then:
  - Show exactly what you would send to the employer and get a clear yes first.
  - Send only what that application needs.
  - Never submit or accept terms (such as agreeing to a background check or an assessment) without asking.
- Never make up or embellish anything about the person in an application.

## Be honest about limits

- Listings come from the job sources, not from OJCP or ojcp.dev. A listing can be out of date; the apply page is the final word on whether a job is still open.
- The registry marks some sources as reference or test implementations with sample data. The helper leaves those out. Don't present sample jobs as real.
- If results are thin, say so plainly and suggest widening the role, place or remote preference, rather than stretching weak matches.
