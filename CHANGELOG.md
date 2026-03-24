# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

### [1.3.2] - 2026-03-24

#### Changed

- fix(mfrom): use optional chaining on params[0]
- fix(err): send err.message to results, not err

### [1.3.1] - 2026-03-19

- doc(README): added next hop examples
- return an error string with DENYSOFT
- chore: improve HTTP error handling
- test: added a few more

### [1.3.0] - 2026-03-17

- fix(hook_get_mx): use modern URL auth fields
- chore: more transaction guarding
- chore: refactor get_qmd_response as async
  - use fetch instead of node:http
  - add test coverage
- test: remove done callbacks in async tests (#22)
- test: convert callback-style tests to async/await
- test: switch test runner: mocha -> node --test
- test: added more tests

### [1.2.5] - 2025-02-06

- fix: check txn still exists after callback

### [1.2.4] - 2025-01-26

- move prettier config into package.json
- dep(eslint): upgrade to v9

### [1.2.3] - 2024-04-22

- fix: use outbound.send_trans_email (was o.send_email)
- populate [files] in package.json.
- dep: eslint-plugin-haraka -> @haraka/eslint-config
- lint: remove duplicate / stale rules from .eslintrc
- prettier
- ci: use more shared GHA workflows
- doc(CONTRIBUTORS): added
- doc(CHANGELOG): fixed version release URLs

### [1.2.1] - 2023-06-12

- fix: use arrow fn in load_qmd_ini callback

### [1.2.0] - 2023-06-12

- previously, would set next_hop=lmtp w/o setting q.wants=lmtp
- feat: also route via LMTP for local recipients when relaying
- cfg: rename check_outbound -> check_mail_from
- cfg: declare check_mail_from as boolean
- doc: added queue.wants & next_hop
- chore: much refactoring to simplify do_qmd_response
- chore: replace url.parse with new url.URL()
- chore: added many tests

### [1.1.1] - 2022-11-29

- ci: only publish when package.json has changes
- feat: decrease a log message severity

## 1.1.0 - 2021-01-06

- ci: use shared GHA workflows
- feat: set txt.notes.local_sender & local_recipient
- test: replace nodeunit with mocha
- lint: es6 prefer-template
- lint: es6 object-shorthand
- lint: es6 interpolated strings
- drop node 8 & 10 testing, add 14

## 1.0.6 - 2018-12-20

- set txn.notes.local_recipient

## 1.0.5 - 2018-01-26

- assure transaction still exists before trying to access txn.notes

## 1.0.4 - 2018-01-20

- tighten up LMTP routing to only when explicitely set

## 1.0.3 - 2017-09-26

- use correct name of mail hook
- update loginfo to use get and avoid undef crash

## 1.0.2 - 2017-09-01

- adds ability to route email via notes.queue.wants and queue.next_hop
- when destination is a mailbox and next_hop is a LMTP url, routes via LMTP

## 1.0.1 - 2017-08-29

- initial release

[1.0.1]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.0.1
[1.0.2]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.0.2
[1.1.0]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/1.1.0
[1.1.1]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/1.1.1
[1.2.0]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.0
[1.2.1]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.1
[1.2.2]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.2
[1.3.0]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.3.0
[1.2.3]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.3
[1.2.4]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.4
[1.2.5]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.2.5
[1.3.0]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.3.0
[1.3.1]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.3.1
[1.3.2]: https://github.com/haraka/haraka-plugin-qmail-deliverable/releases/tag/v1.3.2
