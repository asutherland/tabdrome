/**
 * Persists user workflows.  Exists as a separate class and concept because we
 * want workflows to be something that can be shared and it is vital to
 * disentangle the workflow from potentially user-private information.
 *
 * As an example concern, Thunderbird assigns tag identifiers based on the label
 * the tag is first created with.  However, subsequent label changes will not
 * change the underlying tag name.  The result is that naively exported
 * Thunderbird message rules based on tags could be embarassing.  So we want to
 * be overly paranoid about such risks and this class and its goals are a small
 * part of that.
 *
 * TODO: Now that we have the WorkflowManager and soon will have helpers more
 * concerned with privacy, strip out the useful notions out of the comment above
 * and re-write.
 *
 * ### Schema ###
 * Everything's currently a single map keyed by workflow name and wrapped in a
 * version-tracking object.  In the future we probably just want our own
 * objectStore where the rows are workflows keyed by their name.  If we ever
 * end up with thousands of workflows, then maybe we'd want to introduce some
 * form of index or optimized digest for impacted origins.
 */
export default class WorkflowStore {
  constructor({ storageManager }) {
    this.storageManager = storageManager;

    this.workflowsByName = null;

    this._load();
  }

  async _load() {
    const loaded = await this.storageManager.registerClient(this);

    if (loaded && loaded.version === 1 && loaded.data instanceof Map) {
      this.workflowsByName = loaded.data;
      console.log('Workflows loaded:', this.workflowsByName);
      return;
    }

    this.workflowsByName = new Map();
  }

  getWorkflowNames() {
    return this.workflowsByName.keys();
  }

  getWorkflow(name) {
    return this.workflowsByName.get(name);
  }

  getAllWorkflows() {
    return new Map(this.worksflowsByName);
  }

  setWorkflow(workflow) {
    if (!workflow.name) {
      throw new Error('workflow needs a name');
    }
    this.workflowsByName.set(workflow.name, workflow);
    this.storageManager.reportDirtyClient(this);
  }

  deleteWorkflowByName(workflowName) {
    this.workflowsByName.delete(workflowName);
    this.storageManager.reportDirtyClient(this);
  }

  persistContents() {
    return { version: 1, data: this.workflowsByName };
  }
}
