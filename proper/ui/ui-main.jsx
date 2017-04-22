const React = window.React = require('react');
const ReactDOM = window.ReactDOM = require('react-dom');

const ClientBridgeFrontend = require('./client_bridge_frontend');

const VertTabBar = require('./components/vert_tab_bar');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      clientBridge: null,
      rootGroup: null
    };
  }

  componentWillMount() {
    const clientBridge = new ClientBridgeFrontend({
      onUpdate: (rootGroup) => { this.onUpdate(rootGroup); }
    });
    this.setState({
      clientBridge
    });
  }

  onUpdate(rootGroup) {
    console.log('got new state!', rootGroup);
    this.setState({
      rootGroup
    });
  }

  render() {
    let rootGroup = this.state.rootGroup;

    if (!rootGroup) {
      return <div></div>;
    }

    return (
      <div>
        <VertTabBar group={ rootGroup } />
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('content')
);
