# Contributing

Thank you for helping! Issues and pull requests are welcome.

## License of contributions

This project is licensed under [AGPL-3.0-or-later](LICENSE), with the additional terms in [NOTICE.md](NOTICE.md).
By contributing, you agree that your contribution is licensed under the same terms ("inbound = outbound"). You keep
the copyright in your own work.

## Sign off your commits (DCO)

We use the [Developer Certificate of Origin](https://developercertificate.org/) (DCO): by signing off a commit you
certify that you wrote it, or otherwise have the right to submit it under this project's license. Add the sign-off
with `-s`:

```sh
git commit -s -m "Explain the fibre splitter"
```

This adds a line with your name and email, which must be your real name:

```
Signed-off-by: Your Name <you@example.com>
```

Forgot it? `git commit --amend -s` fixes the last commit, and `git rebase --signoff main` all commits on your branch.

## Before you open a pull request

- `npm test` and `npm run build` pass.
- New content is added as folders under `content/` ([docs/authoring.md](docs/authoring.md)); the engine in `src/`
  names no content ids ([docs/architecture.md](docs/architecture.md)).
- Text is in English and Danish, at both levels (Simple and Technical: the `kid` and `nerd` keys) where it differs.
