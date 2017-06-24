import { DELETED_WORKFLOW, GOT_CLIENT, UPDATED_WORKFLOW } from './actionTypes';

// Our mechanism to get our client into the state.  Alternately we could have
// used a singleton.  This doesn't seem 100% right, but seems better than the
// singleton approach.
export function gotClient(client) {
  return {
    type: GOT_CLIENT,
    client
  };
}

// Process a back-end or locally issued workflow change.
export function updatedWorkflow(workflow) {
  return {
    type: UPDATED_WORKFLOW,
    workflow
  };
}

// Process a back-end or locally issued workflow deletion.
export function deletedWorkflow(workflowName) {
  return {
    type: DELETED_WORKFLOW,
    workflowName
  };
}

// Perform a save, telling the backend and ourselves.
export function saveWorkflow(workflow) {
  return (dispatch, getState) => {
    const { client } = getState();
    client.saveWorkflow(workflow);
    return updatedWorkflow(workflow);
  };
}

// Perform a deletion, telling the backend and ourselves.
export function deleteWorkflow(workflowName) {
  return (dispatch, getState) => {
    const { client } = getState();
    client.deleteWorkflow(workflowName);
    return deletedWorkflow(workflowName);
  };
}
