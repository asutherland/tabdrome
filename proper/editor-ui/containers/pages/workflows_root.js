import { connect } from 'react-redux';
import WorkflowsRootPage from '../../components/pages/workflows_root.jsx';

const mapStateToProps = (state) => {
  return {
    workflows: state.workflows.workflows
  };
};

const ConnectedWorkflowsRootPage = connect(
  mapStateToProps
)(WorkflowsRootPage);

export default ConnectedWorkflowsRootPage;
