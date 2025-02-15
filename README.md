[![Build Status][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]

# haraka-plugin-qmail-deliverable

A client for checking the deliverability of an email address against the [qmail-deliverabled](http://search.cpan.org/dist/Qmail-Deliverable/) daemon.

On incoming messages (relaying=false), validate the RCPT TO address.

## Configuration

The host and port that qmail-deliverabled is listening on can be set in `config/qmail-deliverable.ini`

- `host` (Default: localhost)
- `port` (Default: 8998)
- `check_mail_from`= (Default: true)

When `check_mail_from` is enabled, the MAIL FROM address is checked for deliverability. The deliverable status can be inspected by checking `transaction.notes.local_sender`. This information can be used later to influence mail routing.

### Fine control of MX routing

MX routing for individual domains can be set by defining `queue` and `next_hop`.

- `queue`: a queue plugin (smtp_forward, qmail-queue, lmtp), or lmtp. When `queue=lmtp`, if qmail-deliverable reports that the destination address is a mailbox (ie, not email list, forward, alias, etc.), then this plugin will configure the next_hop to be `lmtp://$host/` and will set up that route (via `get_mx()`) so that outbound delivers the message to the mailbox via LMTP.

- `next_hop`: a URL. Examples: `smtp://mx.example.com` and `lmtp://int.mx.example.com:24`. This plugin uses next_hop to direct messages to local mailboxes via LMTP. If the LMTP server (dovecot, in my case) is not the same host that is running qmail-deliverabled, set next_hop accordingly.

## Per-domain Configuration

Domains can have their own configuration. The defaults are the same, so only the differences
needs to be declared. Example:

    ```ini
    [example.com]
    host=192.168.0.1

    [example2.com]
    host=192.168.0.2
    ```

<!-- leave these buried at the bottom of the document -->

[ci-img]: https://github.com/haraka/haraka-plugin-qmail-deliverable/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/haraka/haraka-plugin-qmail-deliverable/actions/workflows/ci.yml
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-qmail-deliverable/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-qmail-deliverable
