# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Site Not Found" [level=1] [ref=e2]
  - heading "Why am I seeing this?" [level=2] [ref=e3]
  - paragraph [ref=e4]: "There are a few potential reasons:"
  - list [ref=e5]:
    - listitem [ref=e6]: You haven't deployed an app yet.
    - listitem [ref=e7]: You may have deployed an empty directory.
    - listitem [ref=e8]: This is a custom domain, but we haven't finished setting it up yet.
  - heading "How can I deploy my first app?" [level=2] [ref=e9]
  - paragraph [ref=e10]:
    - text: Refer to our
    - link "hosting documentation" [ref=e11] [cursor=pointer]:
      - /url: https://firebase.google.com/docs/hosting/
    - text: to get started.
  - link [ref=e12] [cursor=pointer]:
    - /url: https://firebase.google.com
    - img [ref=e13]
```