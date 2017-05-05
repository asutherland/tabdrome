The `TabTracker` exposes a normalized tab representation to the rest of the
extension.  This file documents it.

# Meta #

## Why? ##

We need a normalized representation because we're allowing content scripts (or
clever URL analyzers) to provide us supplemental data like rich breadcrumb
information, "you wrote something in the bug!" indications, and gmail new
message counts-by-tab/labels.

There is also the need to do things that paper over current limitations in the
chrome.tabs API, or simply the Gecko implementation of it.  For example, as I
write this, openerTabId currently does not work and tab id's are non-persistent
between sessions.

Ideally, most of the differences between our normalized tab representation and
what the chrome.tabs or successor API provides to us will go away.

## Representation Choices ##

The normalized tab representation is an inert object dictionary with no
prototype chain other than Object, no functions/getters/setters, and no direct
references to other normalized tabs.  This means that it can be safely
structured cloned or JSON.stringify()ed without surprises.

## Of Ordering And Soups ##

The `TabTracker` always treats tabs as a big soup.  It does not tell anyone
about tabs in any order.  If it is using a Set, the order of the set has no
relevance to the UI or explicit tab `index` values.

The `Tabulator`'s byproduct generates lists and their ordering is significant,
as controlled by the arrangers.

# Docs #

## Field Descriptions ##

- id: This is just the chrome.tabs API issued id.  This will always be that id,
  because it minimizes confusion.

- suid: The sufficiently unique id for the tab.  This is our issued id that
  theoretically is better than the normal `id`.  It currently is just the `id`
  with "!" prepended.  We do this because 1) we're not doing anything clever
  yet, and 2) it's an invitation to bugs if we don't force some type of
  divergence of the values.

- serial: The value of the TabTracker's `globalSerial` (which increments every
  time the state of tabs changes) when this tab was last updated.  This allows
  downstream code to more efficiently tell if something changed, and for
  deterministic aggregates to use Math.max() over the serials of their
  constituent parts in order to accurately convey if they (may) have changed.
  Note that since tabs can be removed, aggregates will need to also consume the
  `globalSerial` and/or do fancier things like hash on the contents of the
  aggregates.

- createdTS: The milliseconds-since-epoch timestamp at which the tab was
  believed to have been created.  You would use this if you wanted to order tabs
  by when they were created.  No effort is made to correct for adjustments made
  to the system clock by NTP/friends.  (Use of performance.now() for this value
  was ruled out because 0 is not consistent between windows.)

- windowId: The standard chrome.tabs value.  In Firefox this is the outer window
  id which means it does not change on navigation.  (The outer window
  corresponds to the WindowProxy in cross-rowser/spec parlance.)

- index: The standard chrome.tabs value indicated the tab's position index
  within the window it lives in.  This may cease to have meaning if we aren't
  updating this field.  NOTE: Firefox

- openerTabId: The standard chrome.tabs value, which currently is not provided
  by Gecko.

- active: The standard chrome.tabs value indicating whether the tab is the
  active tab in its window, regardless of window state.

- lastActivatedSerial: The value of `serial` when this tab's `active` value was
  last set to true.  0 if the tab has never been active since the TabTracker
  started up.  The value will not change until `active` becomes false and is
  later set to `true` again.  This can be used to implement an MRU ordering of
  tabs.

- pinned: The standard chrome.tabs value indicating whether the tab is pinned
  or not.

- parsedUrl: It's just the tab's URL parsed up by URL/URLUtils and expanded into
  the following fields.  We call it parsedUrl rather than just url to avoid
  confusion with the base chrome.tabs `url` field.  In some ways fully parsing
  and expanding this is silly, but given our structured clone/JSON goals and the
  weird not-fully-standardized state of
  https://developer.mozilla.org/en-US/docs/Web/API/URL/URL which means we might
  need to polyfill our use on some platforms, it arguably makes enough sense.
  Included fields, whose documentation can be found at
  https://developer.mozilla.org/en-US/docs/Web/API/URL so I can save some
  copying and pasting here:
  - href: the whole URL
  - protocol
  - host
  - hostname
  - port
  - pathname
  - search
  - hash
  - username
  - password
  - origin
  - searchParams: We iterate over this and use it to populate an
    object-as-dictionary whose keys are the search keys and the values are the
    last value we observed for that key.  In other words, if there is "foo=bar"
    and "foo=baz" in the query, this object's "foo" key will have the value
    "baz".  If you want something fancier, you can parse up `search` yourself.

- title: The standard chrome.tabs value that is the document.title of the page.

- favIconUrl: The standard chrome.tabs value.

- status: The standard chrome.tabs "loading" or "complete" value.

- incognito: The standard chrome.tabs value indicating private browsing /
  incognito status.

- audible: Standard chrome.tabs value indicating whether the tab is trying to
  make noise (but may be blocked by being muted.)

- muted: Flattened tab.mutedInfo.muted value, is the tab muted?  The fields are
  flattened because I'm more concerned about screwing up the traversal of an
  optional sub-object than I am about this structure being messy.
- mutedReason: Flattened tab.mutedInfo.reason, currently defined to be one of
  "capture", "extension", "user".  "extension" means mutedExtensionId should be
  set.
- mutedExtensionId: Flattened tab.mutedInfo.extensionId.

- cookieStoreId: A string like "firefox-default" or "firefox-container-4" that
  identifies the origin suffix that identifies the cookie jar persistent storage
  for this tab is stored in.  Feature-wise, this corresponds to Firefox's
  contextual identities functionality.  The string  can be passed to
  browser.contextualIdentities.get() or used in the browser.cookies API as the
  name of a cookie store.

- sessionId: A string identifier issued by the browser.sessions API when it is
  describing a persisted tab.  Used by browser.sessions.restore() to restore a
  tab to existence.  Not currently likely to be populated, but I was hoping
  this might secretly leak information from Firefox's session store.  It does
  not.

- width: The standard chrome.tabs clientWidth of the frame displaying the
  contents of the tab... I think?  Gecko seems to provide it this way.

- height: The standard chrome.tabs clientHeight of the frame displaying the
  contents of the tab... I think?  Gecko seems to provide it this way.

- fromContent: This is an object dictionary of data sent to us from content
  scripts or URL analyzers (in cases where the URLs are sufficiently reliable
  that we can avoid touching content or we really just don't feel right about
  injecting stuff into content for security hygiene reasons).  In the future
  maybe this could be stuff the content just exposes to us via meta tags and
  open graph/JSON-LD/RDFa/whatever and content scripts wouldn't be involved at
  all.  Our logic literally will just save off the keys/values it receives from
  content, but the convention we have adopted for now is:
  - breadcrumbs: A list of objects of the form { url, text } where url may be
    omitted if unavailable/undesirable, but text must be present.  The intent
    is that text provides a textual description of the hierarchy, and if
    present, the url allows us to linkify that text to open a new tab (with an
    assumed breadcrumb path of that location).
  - alerts: A list of one or more alert tags intended to be mapped to badges
    on the tab.  Currently, the only supported tag is "modified" which is
    intended to convey that the user has modified something on the page and
    they probably want to remember to finish modifying whatever it is.  Example
    cases are bug entry forms and wiki editing pages.
  - details: A list of objects of the form { type, key, value }.  The idea is
    that the type helps indicate to the UI how it should present the given key
    and value.  For example, the gmail web UI has a tabbed interface where it
    has the concept of new mail for each tab.  In this case, the type would be
    "newmail", the key would be "Primary"/"Social"/"Promotions"/etc. and the
    value would be the Number of new messages.



## Future Fields ##

These are all standard chrome.tabs fields that Gecko currently does not provide
and so we don't bother to propagate them or acknowledge that they exist outside
of this high quality document.

- audible
- mutedInfo
- sessionId
