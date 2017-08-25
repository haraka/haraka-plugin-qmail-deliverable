[![Build Status][ci-img]][ci-url]
[![Code Climate][clim-img]][clim-url]
[![Greenkeeper badge][gk-img]][gk-url]
[![NPM][npm-img]][npm-url]
<!-- requires URL update [![Windows Build Status][ci-win-img]][ci-win-url] -->
<!-- doesn't work in haraka plugins... yet. [![Code Coverage][cov-img]][cov-url]-->

# haraka-plugin-qmail-deliverable

A client for checking the deliverability of an email address against the [qmail-deliverabled](http://search.cpan.org/dist/Qmail-Deliverable/) daemon.

On incoming messages (relaying=false), the RCPT TO address is validated.

On outgoing messages (relaying=true) the MAIL FROM address is validated when
the `check\_outbound` option is enabled.

## Configuration

The host and port that qmail-deliverabled is listening on can be set by
altering the contents of `config/rcpt_to.qmail_deliverable.ini`

* `host` (Default: localhost)

* `port` (Default: 8998)

* `check_outbound`=true

When `check_outbound` is enabled, and a connection has relay privileges, the
MAIL FROM address is validated as deliverable.

## Per-domain Configuration

Additionally, domains can each have their own configuration for connecting
to qmail-deliverabled. The defaults are the same, so only the differences
needs to be declared. Example:

    [example.com]
    host=192.168.0.1

    [example2.com]
    host=192.168.0.2


<!-- leave these buried at the bottom of the document -->
[ci-img]: https://travis-ci.org/haraka/haraka-plugin-qmail-deliverable.svg
[ci-url]: https://travis-ci.org/haraka/haraka-plugin-qmail-deliverable
[ci-win-img]: https://ci.appveyor.com/api/projects/status/CHANGETHIS?svg=true
[ci-win-url]: https://ci.appveyor.com/project/haraka/haraka-CHANGETHIS
[cov-img]: https://codecov.io/github/haraka/haraka-plugin-qmail-deliverable/coverage.svg
[cov-url]: https://codecov.io/github/haraka/haraka-plugin-qmail-deliverable
[clim-img]: https://codeclimate.com/github/haraka/haraka-plugin-qmail-deliverable/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-plugin-qmail-deliverable
[gk-img]: https://badges.greenkeeper.io/haraka/haraka-plugin-qmail-deliverable.svg
[gk-url]: https://greenkeeper.io/
[npm-img]: https://nodei.co/npm/haraka-plugin-qmail-deliverable.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-qmail-deliverable
rcpt\_to.qmail\_deliverable