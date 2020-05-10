/**
 * Stores information about sites and their various path prefixes that ideally
 * might be stored in some kind of global store like Places.  However, even if
 * we could access Places more directly, it's worth noting that Places is
 * primarily about bookmarks and visits, with bookmarks inherently being treated
 * as endorsements, and history being inherently ephemeral.  So this would want
 * to continue to exist in some form even when we can better consult places.
 */
export default class SiteMetadataStore {
  constructor({ storageManager }) {
    this.storageManager = storageManager;
  }
}
