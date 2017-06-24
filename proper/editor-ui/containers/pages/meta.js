import { connect } from 'react-redux';
import MetaPage from '../../components/pages/meta.jsx';

const mapStateToProps = (state) => {
  return {
    workflows: state.workflows.workflows
  };
};

const ConnectedMetaPage = connect(
  mapStateToProps
)(MetaPage);

export default ConnectedMetaPage;
