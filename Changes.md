
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
