var webpack = require('webpack');
var path = require('path');
var buildPath = path.resolve(__dirname, 'build');
var TransferWebpackPlugin = require('transfer-webpack-plugin');

var config = {
  mode: 'development',
  entry: {
    // Tab display UI entry-point.  Loaded from static/tabdrome.html
    'ui-main': path.resolve(__dirname, 'proper/tab-ui/ui-main.jsx'),
    // Editor UI entry-point.  Loaded from static/editor.html
    'editor-ui-main': path.resolve(__dirname, 'proper/editor-ui/editor-ui.jsx'),
    // The backend logic that lives in a background page and the JS is directly
    // loaded as defined in static/manifest.json without any HTML page involved.
    'backend-main': path.resolve(__dirname, 'proper/backend/main.js'),
    // Content scripts: currently just the one.
    'content-digger':
      path.resolve(__dirname, 'proper/content_scripts/simple_query_digger.js'),
  },
  resolve: {
    alias: {},
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  //Render source-map file for final build
  devtool: 'source-map',
  //output config
  output: {
    path: buildPath,    //Path of output file
    filename: '[name].js'  //Name of output file
  },
  plugins: [
    // Keep going on errors.
    new webpack.NoEmitOnErrorsPlugin(),
    // Migrate static stuff into build.
    new TransferWebpackPlugin([
      { from: 'static', to: '' }
    ], __dirname),
    new webpack.DefinePlugin({
      'process.env': {
        //NODE_ENV: JSON.stringify('production')
      }
    })
  ],
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },

      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { test: /\.js$/, loader: 'source-map-loader' }
    ]
  }
};

module.exports = config;
