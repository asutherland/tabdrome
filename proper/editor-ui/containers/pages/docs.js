import { connect } from 'react-redux';
import DocsPage from '../../components/pages/docs.jsx';

const mapStateToProps = (state) => {
  return {
    workflows: state.workflows.workflows
  };
};

const ConnectedDocsPage = connect(
  mapStateToProps
)(DocsPage);

export default ConnectedDocsPage;
