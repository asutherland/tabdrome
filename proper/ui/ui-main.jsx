const React = window.React = require('react');
const ReactDOM = window.ReactDOM = require('react-dom');
const PureRenderMixin = require('react-addons-pure-render-mixin');

const ClientBridgeFrontend = require('./client_bridge_frontend');

const VertTabBar = require('./components/vert_tab_bar');

const App = React.createClass({
  mixins: [PureRenderMixin],

  getInitialState: function() {
    return {
      clientBridge: null,
      normTabsById: new Map()
    };
  },

  componentWillMount: function() {
    const clientBridge = new ClientBridgeFrontend({
      onUpdate: this.onUpdate
    });
    this.setState({
      clientBridge
    });
  },

  onUpdate: function(normTabsById) {
    console.log('got new state!', normTabsById);
    this.setState({
      normTabsById
    });
  },

  render: function() {
    return (
      <div>
        <VertTabBar normTabsById={ this.state.normTabsById } />
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('content')
);
