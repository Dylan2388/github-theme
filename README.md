# github-theme

A small TypeScript tool that turns GitHub profile data into a set of animated, self-contained SVG cards plus a generated markdown README, then publishes them to the special `<username>/<username>` GitHub profile repo.

## What it is

- Fetches your public GitHub data (profile, repos, pinned repos, contribution calendar).
- Renders it into pre-built SVG cards with SMIL animations.
- Generates a README that embeds those cards.
- Pushes the README and SVG assets to your profile repo on a schedule.

## Why SVGs + markdown

GitHub sanitizes profile READMEs: it strips `<script>` and `<style>` tags entirely, so no client-side JavaScript or inline CSS can run. The only way to get "dynamic" content into a profile README is to pre-render it as an SVG and reference it with `<img>`. SVGs support SMIL animations (`<animate>`, `<animateTransform>`), which continue to play when the SVG is loaded through an `<img>` tag. Everything is computed at build time; the rendered output is static and self-contained.

## Layout

- `src/build.ts` - entry point: loads config and icons, fetches or generates data, renders each card, and writes `profile/public/`.
- `src/github.ts` - REST and GraphQL client, token handling, and pinned-repo selection.
- `src/svg/*.ts` - one renderer per card (`typing`, `stats`, `stack`, `pinned`, `contributions`) plus shared `theme` and `util` helpers.
- `profile/config.json` - all content: name, bio, status, location, org, email, typing phrases, skills, socials, and pinned repos.
- `profile/assets/icons.json` - inline SVG path data for tech and social icons.
- `profile/public/` - generated output (gitignored): `README.md`, `preview.html`, and `assets/*.svg`.

## Token

The build resolves the token in this order:

1. `GITHUB_TOKEN` / `GH_TOKEN` environment variable.
2. A `github.com` / `api.github.com` machine entry in `~/.netrc` (mode 600).

For publishing, the token also needs write permission to create/push the
`<user>/<user>` repo (classic PAT with `repo` scope, or a fine-grained PAT
with Administration + Contents write). A read-only token can build but not
publish.

## Commands

| Command | Description |
| --- | --- |
| `npm run build` | Real data. Uses env token or `~/.netrc`. |
| `npm run build:demo` | Offline demo data, no network or token needed. |
| `npm run preview` | Demo build plus `profile/public/preview.html` for local viewing. |
| `npm run typecheck` | Runs `tsc --noEmit`. |
| `npm run publish` | Builds with real data and pushes to the profile repo. Requires `GITHUB_TOKEN` with `repo` scope. |

## Configuration

All content lives in `profile/config.json`:

- `user` - GitHub username. Also the profile repo name (`<user>/<user>`) and the source of asset URLs.
- `name` - display name in the README header.
- `status` - short one-line status shown under the bio.
- `bio` - paragraph of biographical text.
- `location` - optional location, rendered as a fact.
- `org` - optional organization, rendered as a fact.
- `email` - optional email, rendered as a mailto link.
- `footer` - optional small-print line at the bottom.
- `typing` - array of phrases cycled in the animated typing card.
- `skills` - array of `{ name, level }` (level 0-100) rendered as bars in the stack card.
- `pinned` - either the string `"auto"` or an explicit array of repo names.
- `pinnedCount` - how many repos to show in the pinned card when `pinned` is `"auto"`.

## Publishing

`src/publish.ts` builds with real data into `profile/public/`, ensures the `<username>/<username>` repo exists, clones it, copies in `README.md` and `assets/`, and pushes. The generated README references its images through:

```
https://raw.githubusercontent.com/<username>/<username>/main/assets/*.svg
```

Because those URLs point at the profile repo's `main` branch, the cards update for anyone viewing your profile as soon as the push lands.

## Automation

`.github/workflows/build-profile.yml` regenerates and publishes the profile on a schedule (daily), on manual dispatch, and on every push to `main`. The workflow uses a `PROFILE_TOKEN` secret, which must be a classic personal access token with `repo` scope so it can create and push to the profile repo.

## CI

`build-profile.yml` regenerates + publishes the profile on push to main and daily at 05:17 UTC.
