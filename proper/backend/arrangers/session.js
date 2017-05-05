/**
 * Session arranging is just standard link-opened hierarchical parent/child
 * stuff right now.  In the future we might be also somewhat temporally aware
 * (so new tabs starting their own roots but performed within the same time
 * period get clustered together in a group, potentially retroactively) and/or
 * be aware of certain sites being loaded explicitly having some semantic
 * meaning for sessions.
 *
 * For example, opening reddit/hacker news/twitter could
 * initiate a "procrastination session" that starts a little clock, etc.  (where
 * the inference and conclusion of the session would be provided by another
 * extension, ideally.  There's a lot of wiggle room about responsiblity for
 * the various pieces.)
 */
class SessionArranger {
  constructor() {
  }

  bidForTab(/*normTab*/) {
    // We can place all tabs!  Hooray!
    return 'meh';
  }

  arrangeTabs(normTabs, root) {
    // (we are given all the tabs at once so that we can handle ordering )
    for (let normTab of normTabs) {
      // Currently openerTabId doesn't work and we have no hack-fix, so just
      // let's order by the traditional tab order.
      root.getOrCreateGroup(
        {
          // nothing special, we're just a tab.
          type: 'tab',
          tabSuid: normTab.suid
        },
        {
          rootSortGroup: normTab.pinned ? 'pinned' : 'normal',
          serial: normTab.serial,
          tab: normTab
        });
    }
  }
}

module.exports = SessionArranger;
