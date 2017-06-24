/**
 * Talks to the back-end for editor related things.  In the future the editor
 * may get to be its own extension and will talk using extension-to-extension
 * messaging.
 */
export default class ClientBridgeEditor {
  constructor({ onUpdatedWorkflow, onDeletedWorkflow }) {
    this._onUpdatedWorkflow = onUpdatedWorkflow;
    this._onDeletedWorkflow = onDeletedWorkflow;

    this.port =
      chrome.runtime.connect({ name: 'editor-ui-bridge' });
    this.port.onMessage.addListener(this._onMessage.bind(this));

    this.loaded = new Promise((resolve) => {
      this._resolveLoaded = resolve;
    });
  }

  _onMessage(msg) {
    switch (msg.type) {
      case 'all-workflows': {
        for (const workflow of msg.workflows.values()) {
          this.onUpdatedWorkflow(workflow);
        }
        this._resolveLoaded();
        this._resolveLoaded = null;
        break;
      }

      case 'workflow': {
        this.onUpdatedWorkflow(msg.workflow);
        break;
      }

      case 'deleted-workflow': {
        this.onDeletedWorkflow(msg.workflowName);
        break;
      }

      default: {
        console.error(`unsupported editor bridge message type: ${msg.type}`);
      }
    }
  }

  saveWorkflow(workflow) {
    this.port.postMessage({
      type: 'save-workflow',
      workflow
    });
  }

  deleteWorkflowByName(workflowName) {
    this.port.postMessage({
      type: 'delete-workflow',
      workflowName
    });
  }
}
