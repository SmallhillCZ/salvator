---
name: bump-version
description: Bump the project version by creating the next semver git tag and pushing it to the remote. The user must specify patch, minor or major. Use when the user asks to bump the version, release a new version, tag a release, or says "/bump-version".
---

# Bump version

Create the next semantic version tag in git and push it to the remote.

## Input

The bump level is required: `patch`, `minor` or `major`.

- It may come as the skill argument (`/bump-version minor`) or from the user's message.
- If the level is missing or ambiguous, ask the user which one before doing anything else. Never guess.

## Steps

1. Make sure the working tree is clean and the current branch is up to date with the remote:

   ```bash
   git status --porcelain
   git fetch --tags origin
   ```

   If there are uncommitted changes, stop and tell the user to commit or stash them first.

2. Find the highest existing version tag:

   ```bash
   git tag -l 'v*.*.*' --sort=-v:refname | head -1
   ```

   Tags use the `vMAJOR.MINOR.PATCH` format. If no version tag exists, treat the current version as `v0.0.0`.

3. Compute the new version from the requested level:

   - `patch`: `v1.2.3` → `v1.2.4`
   - `minor`: `v1.2.3` → `v1.3.0`
   - `major`: `v1.2.3` → `v2.0.0`

4. Verify the new tag does not already exist. If it does, stop and report it.

5. Create an annotated tag on `HEAD` and push it:

   ```bash
   git tag -a <new-version> -m "<new-version>"
   git push origin <new-version>
   ```

6. Report the old version, the new version, and the commit the tag points at.

## Notes

- Only the tag is created. Do not touch `package.json` or any other file, and do not make a commit.
- Do not push the branch itself, only the tag.
- Ignore non-version tags such as `backup` when looking for the latest version.
