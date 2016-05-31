const React = window.React = require('react');
const PureRenderMixin = require('react-addons-pure-render-mixin');

const VertTabBar = React.createClass({
  mixins: [PureRenderMixin],

  render: function() {
    const normTabs = Array.from(this.props.normTabsById.values());
    return <pre>{ JSON.stringify(normTabs, null, 2) }</pre>;
  }
});

module.exports = VertTabBar;
