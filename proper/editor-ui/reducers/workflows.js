import { DELETED_WORKFLOW, GOT_CLIENT, UPDATED_WORKFLOW }
  from '../actions/actionTypes';

const DEFAULT_STATE = {
  client: null,
  workflows: Map(),
  // monotonically increasing workflow 'clock'/generation
  workflowSerial: 1
};

export function reduceWorkflows(state = DEFAULT_STATE, action) {
  switch (action.type) {
    case GOT_CLIENT:
      return Object.assign({}, state, {
        client: action.client
      });

    case UPDATED_WORKFLOW: {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.set(action.workflow.name, action.workflow);
      return Object.assign({}, state, {
        workflows: newWorkflows,
        workflowSerial: state.workflowSerial + 1
      });
    }

    case DELETED_WORKFLOW: {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.delete(action.workflowName);
      return Object.assign({}, state, {
        workflows: newWorkflows,
        workflowSerial: state.workflowSerial + 1
      });
    }

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}
