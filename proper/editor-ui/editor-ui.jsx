import React from 'react';
import ReactDOM from 'react-dom';

window.React = React;
window.ReactDOM = ReactDOM;

import { Redirect, Route, Switch } from 'react-router-dom';
import { ConnectedRouter } from 'react-router-redux';

import ClientBridgeEditor from './client_bridge_editor';

import { store, history } from './store';

import NewWorkflowPage from './containers/pages/new_workflow';
import WorkflowMetaPage from './containers/pages/meta';
import WorkflowDocsPage from './containers/pages/docs';
import WorkflowEditorPage from './containers/pages/editor';
import WorkflowsRootPage from './containers/pages/workflows_root';

import { gotClient, updatedWorkflow, deletedWorkflow }
  from './actions/workflows';

class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let rootGroup = this.state.rootGroup;

    if (!rootGroup) {
      return <div></div>;
    }

    return (
      <Provider store={ store }>
        <ConnectedRouter history={ history }>
          <Switch>
            <Route exact path='/workflows/new/'
                   component={ NewWorkflowPage }/>
            <Route exact path='/workflows/:workflowId/meta/'
                   component={ WorkflowMetaPage }/>
            <Route exact path='/workflows/:workflowId/docs/'
                   component={ WorkflowDocsPage }/>
            <Route path='/workflows/:workflowId/:workflowPart/'
                   component={ WorkflowEditorPage }/>
            <Route exact path='/workflows/'
                   component={ WorkflowsRootPage }/>
            <Redirect to='/worksflows/' />
          </Switch>
        </ConnectedRouter>
      </Provider>
    );
  }
}

async function init() {
  const clientBridge = new ClientBridgeEditor({
    onUpdatedWorkflow: (workflow) => {
      store.dispatch(updatedWorkflow(workflow));
    },

    onDeletedWorkflow: (workflowName) => {
      store.dispatch(deletedWorkflow(workflowName));
    }
  });
  store.dispatch(gotClient(clientBridge));

  await clientBridge.loaded;

  ReactDOM.render(
    <App clientBridge={ clientBridge }/>,
    document.getElementById('content')
  );
}
init();
