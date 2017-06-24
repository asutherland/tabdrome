/**
 * Services requests from the editor-ui's `ClientBridgeEditor`.  Directly
 * manipulates the workflowStore
 */
class WorkflowClient {
  constructor({ port, workflowManager, broadcastToOtherClients }) {
    this.port = port;
    this.workflowManager = workflowManager;
    this.broadcastToOtherClients = broadcastToOtherClients;
  }

  onClientRequest(msg) {
    const { workflowStore } = this.workflowManager;
    switch (msg.command) {
      // currently not used in our 'send everything' approach.
      /*
      case 'list-workflows':
        return workflowStore.getWorkflowNames();

      case 'get-workflow':
        return workflowStore.getWorkflow(msg.workflowName);

      case 'get-all-workflows':
        return workflowStore.getAllWorkflows();
      */

      case 'save-workflow':
        workflowStore.setWorkflow(msg.workflow);
        this.broadcastToOtherClients({
          type: 'workflow',
          workflow: msg.workflow
        });
        return undefined;

      case 'delete-workflow':
        workflowStore.deleteWorkflowByName(msg.workflowName);
        this.broadcastToOtherClients({
          type: 'deleted-workflow',
          workflowName: msg.workflowName
        });
        return undefined;

      default:
        throw new Error(`unsupport command: ${msg.command}`);
    }
  }

  onClientDisconnected() {
    // currently a NOP.
  }
}

/**
 * Coordinates workflow lifecycles.  This means:
 * - Loading workflows from disk via the WorkflowStore and applying them to the
 *   ContentDigger, ContextSearcher, and RulesRuler.
 * - Forking off WorkflowClients as new editor clients connect and want to talk
 *   to the manager.
 */
export default class WorkflowManager {
  constructor ({ workflowStore }) {
    this.workflowStore = workflowStore;
  }

  newClient({ port, broadcastToOtherClients }) {
    return new WorkflowClient({
       port,
       workflowManager: this,
       broadcastToOtherClients
     });
  }
}
