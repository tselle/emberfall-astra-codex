# Repository workflow

After each request that changes the repository:

1. Run `node tests/validate.js`, `node tests/playtest.js`, and `node tests/chrome.js`. If a check fails, fix it and rerun before publishing.
2. Stage only the changes for the request. Commit with the version hook enabled (`git config --local core.hooksPath .githooks`).
3. Push the commit to the current branch's upstream and confirm the branch is in sync. Use GitHub CLI credentials over HTTPS if SSH authentication is unavailable.

Do not create an empty commit for a question or a no-change request. Follow any explicit request not to commit or push.
