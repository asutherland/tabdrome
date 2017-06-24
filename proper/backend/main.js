/**
 * Brings up the back-end so that as per-window tab UIs are brought up, They
 * can connect and be happy and everything works.
 **/

// =============================================================================
// IMPORTS
import StorageManager from './storage/storage_manager';
import InvestigationCache from './storage/investigation_cache';
import SiteMetadataStore from './storage/site_metadata_store';
import TabMetadataStore from './storage/tab_metadata_store';
import WorkflowStore from './storage/workflow_store';

import TabTracker from './tab_tracker';
import Tabulator from './tabulator';
import TabCascader from './tab_cascader';
import ClientBridgeBackend from './client_bridge_backend';

import ContentScriptCoordinator from './content_script_coordinator';

import ContentDigger from './content_digger';
import ContextSearcher from './context_searcher';

import SiteHierarchyArranger from './arrangers/site_hierarchy';
import SessionArranger from './arrangers/session';

import WorkflowManager from './workflow_manager';

import RulesRuler from './rules_ruler';

// =============================================================================
// INITIALIZE
//
// Note that the setup below is not as pretty as it could be.  The dominating
// concern is making relationships explicit and facilitating testing.  The
// alternative to explicit is a generic event listener setup that allows for
// dynamic registration.

const init = async() => {
  // --- Initialize Storage
  const storageManager = new StorageManager();
  const investigationCache = new InvestigationCache({ storageManager });
  const siteMetadataStore = new SiteMetadataStore({ storageManager });
  const tabMetadataStore = new TabMetadataStore({ storageManager });
  const workflowStore = new WorkflowStore({ storageManager });

  // Wait for all stored data to load before bringing up the TabTracker.  Many
  // of the stores and their consumers assume at least some data is
  // synchronously available.
  await storageManager.loadedPromise;

  const workflowManager = new WorkflowManager({ workflowStore });

  const clientBridge = new ClientBridgeBackend({ workflowManager });

  const rulesRuler = new RulesRuler();

  window.cascader = new TabCascader({
    rulesRuler,
    siteMetadataStore, tabMetadataStore,

    // Circular dependencies?  Us?  Never...
    initHelpers: function(tabCascader) {
      const contentScriptCoordinator = new ContentScriptCoordinator();
      const contentDigger = new ContentDigger(
        { tabCascader, contentScriptCoordinator, investigationCache });
      const contextSearcher = new ContextSearcher(
        { tabCascader, contentScriptCoordinator });

      window.tabTracker = new TabTracker({
        onTabCreated: function(normTab) {
          tabCascader.onCreatedNormTab(normTab);
        },
        onTabChanged: function(normTab) {
          tabCascader.onChangedNormTab(normTab);
        },
        onTabRemoved: function(normTab) {
          tabCascader.onRemovedNormTab(normTab);
        }
      });

      return {
        contentScriptCoordinator,
        contentDigger,
        contextSearcher,
      };
    },

    // XXX update
    onWindowTabChanges: function (windowId, windowNormTabsById, globalSerial) {
      const rootGroup = tabulator.tabulate(windowNormTabsById, globalSerial);
      const serializedRootGroup = rootGroup.__serialize();
      clientBridge.onWindowTabChanges(windowId, serializedRootGroup);
    },

    // XXX update
    onWindowRemoved: function (windowId) {
      clientBridge.onWindowRemoved(windowId);
    }
  });
};
init();


// We still want a browser button so we can debug.  The sidebar is a bit
// annoying on this front.
function handleClick() {
  browser.tabs.create({
    url: chrome.extension.getURL('tabdrome.html')
  });
}
browser.browserAction.onClicked.addListener(handleClick);
