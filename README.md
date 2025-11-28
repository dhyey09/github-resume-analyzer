# GitHub Resume Analyzer (Git Analytics)

A small Next.js app that extracts GitHub links from a resume (PDF/DOCX or pasted text), enriches them using the GitHub REST API and displays per-repo metadata and full README content.

## Key features

- Extracts GitHub user and repository links from resume text
- Fetches user profiles, public repo lists, README content and language stats
- Calculates repo duration (first commit → last push) and activity metrics
- Shows full README in a modal with fenced-code copy support and a Commands tab
- Graceful handling of rate limits and limited concurrency when calling GitHub API

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [How it works (internals)](#how-it-works-internals)
- [API: /api/parse-resume](#api-apiparse-resume)
- [Frontend behavior and UI notes](#frontend-behavior-and-ui-notes)
- [Rate limits, caching and next steps](#rate-limits-caching-and-next-steps)
- [Development](#development)
- [License](#license)

## Quick start

Install dependencies and run the dev server:

```bash
npm install
npm run dev
# open http://localhost:3000
```

Upload or paste a resume (PDF/DOCX) in the inbox. The app extracts GitHub links it finds and shows profile/repo details.

## Environment variables

The app works without any environment variables but GitHub's unauthenticated REST API rate limit is low (60 requests/hour per IP). If you plan to analyze many resumes or resumes with many repo links, set a personal access token to increase your rate limit.

- `GITHUB_TOKEN` (optional): a GitHub personal access token with no special scopes is sufficient. Set it in a `.env` file at the project root, e.g.:

```bash
# .env
GITHUB_TOKEN=ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Notes about rate limits

- Unauthenticated: 60 requests / hour per IP
- Authenticated (with token): 5,000 requests / hour for the token

When multiple repo links are present in a resume, the server fetches details for each repo. For many repos this can consume many API requests—using a token is strongly recommended in that case.

## How it works (internals)

- The API endpoint `POST /api/parse-resume` accepts either a multipart form upload (`file`) or JSON body with `text`.
- The server extracts plain text from PDFs (using `pdf-parse` or `pdfjs-dist` fallback) and .docx files (using `mammoth`).
- It runs a robust extractor to find GitHub user/profile and repo links in the text.
- For a discovered user it fetches the user's profile and their public repos (and then for each repo fetches `readme` and `languages`).
- For discovered repo links it fetches the repo information and README directly.
- Concurrency-limited calls: the server uses a small concurrency limiter to avoid firing too many GitHub requests at once.

## API: /api/parse-resume

Request: POST multipart/form-data with `file` or JSON `{ "text": "..." }`.

Response (success):

```json
{
  "success": true,
  "github": [
    {
      "type": "user",
      "owner": "ownername",
      "profile": { /* GitHub user object */ },
      "repos": [ /* enriched repo objects */ ]
    },
    {
      "type": "repo",
      "owner": "owner",
      "repo": "repo-name",
      "repoInfo": { /* GitHub repo object */ },
      "readme": "...",
      "techStack": ["JavaScript","CSS"],
      "firstCommitDate": "2023-01-01T00:00:00Z",
      "lastCommitDate": "2023-07-01T00:00:00Z",
      "durationDays": 181
    }
  ]
}
```

- The endpoint will return either:
  - a single user entry with `profile` + `repos`, or
  - one or more `repo` entries when the resume contains repository links only.

## Frontend behavior and UI notes

- The UI normalizes API output so that repo cards consistently show:
  - README preview and full README in a modal
  - language/tech stack pills
  - star/fork counts
  - created / updated (first/last commit) dates and computed duration (days)
- When multiple repo-only links are returned, each repo is shown as a card with the same metadata fields that are shown when repos are fetched from a profile.
- The README modal includes three tabs: README, Commands (extracted fenced code blocks), and Overview (first/last commit and duration).

## Rate limits, caching and next steps

- Because fetching README and languages for many repos can require many API calls, consider one or more of the following improvements when moving to production:
  - Require/encourage `GITHUB_TOKEN` for higher rate limits
  - Add server-side caching (in-memory TTL or Redis) keyed by `owner/repo` to avoid repeated requests
  - Implement exponential backoff and retries for 403 rate-limit responses
  - Add user-visible messages when rate limits are reached

## Development

- Scripts available in `package.json`:

```bash
npm run dev      # development server
npm run build    # build for production
npm start        # run production build
```

Files/folders of interest

- `app/page.js` - frontend UI and modal logic
- `app/api/parse-resume/route.js` - server-side parsing and GitHub enrichment logic
- `app/layout.js` / `app/globals.css` - global styles and layout

## Contributing

Contributions and improvements are welcome. If you'd like to add caching or better rate-limit handling, open an issue or a PR with a brief description.
