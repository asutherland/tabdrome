import { connect } from 'react-redux';
import EditorPage from '../../components/pages/editor.jsx';

const mapStateToProps = (state) => {
  return {
    workflows: state.workflows.workflows
  };
};

const ConnectedEditorPage = connect(
  mapStateToProps
)(EditorPage);

export default ConnectedEditorPage;
