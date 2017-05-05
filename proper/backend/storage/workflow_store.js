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
 */
class WorkflowStore {

}

module.exports = WorkflowStore;
