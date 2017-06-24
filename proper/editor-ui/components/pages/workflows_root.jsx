import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class WorkflowsRootPage extends Component {
  render() {
    const workflowLinks = this.props.workflows.values().map((workflow) => {
      const base = `/workflows/view/${workflow.name}/`;
      return (
        <section>
          <h3>{ workflow.name }</h3>
          <ul>
            <li><Link to={ base + 'meta/' }>meta</Link></li>
            <li><Link to={ base + 'docs/' }>docs</Link></li>
            <li><Link to={ base + 'commands/' }>commands</Link></li>
            <li><Link to={ base + 'diggers/' }>diggers</Link></li>
            <li><Link to={ base + 'searchers/' }>searchers</Link></li>
            <li><Link to={ base + 'analysis/' }>analysis</Link></li>
            <li><Link to={ base + 'bucketing/' }>bucketing</Link></li>
            <li><Link to={ base + 'decorating/' }>decorating</Link></li>
            <li><Link to={ base + 'arranging/' }>arranging</Link></li>
          </ul>
        </section>
      );
    });

    return (
      <div>
        { workflowLinks }
      </div>
    );
  }
}
