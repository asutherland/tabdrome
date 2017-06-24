/**
 * Best-effort persistent metadata store for information about specific tab
 * instances rather than their URL/site/contents.  This covers both explicit
 * user decisions on how to arrange/configure a tab as well as implicit data
 * like the tab that was middle-clicked to open the current tab or the tab that
 * was open when ctrl-t was used to open the current tab.
 *
 * This store is explicitly not for redundantly storing information that is
 * covered by other stores or caches such as the InvestigationCache.
 *
 * Note that for things like the tab opener, there is potentially some overlap
 * with the browser.tabs.Tab.openerTabId value.  Currently, the functionality
 * is unimplemented in Firefox, the fix is tracked on
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1238314.  As such, we're going
 * to invent our own heuristics around this and are likely end up ignoring
 * openerTabId other than as a strongly weighted input to the heuristics.
 */
export default class TabMetadataStore {

}
