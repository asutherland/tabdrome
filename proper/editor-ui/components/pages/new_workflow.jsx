import { Component } from 'react';

export default class NewWorkflowPage extends Component {
  constructor(props) {
    super(props);

    this.state = { name: '' };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ name: event.target.value });
  }

  handleSubmit(event) {
    this.props.onCreateWorkflow(this.state.name);
    event.preventDefault();
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
        </form>
      </div>
    );
  }
}
