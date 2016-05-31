var webpack = require('webpack');
var path = require('path');
var buildPath = path.resolve(__dirname, 'build');
var nodeModulesPath = path.resolve(__dirname, 'node_modules');
var TransferWebpackPlugin = require('transfer-webpack-plugin');

var config = {
  entry: {
    // Tab display UI entry-point.  Loaded from static/tabdrome.html
    'ui-main': path.resolve(__dirname, 'proper/ui/ui-main.jsx'),
    // The backend logic that lives in a background page and the JS is directly
    // loaded as defined in static/manifest.json without any HTML page involved.
    'backend-main': path.resolve(__dirname, 'proper/backend/main.js'),
  },
  resolve: {
    root: [
    ],
    extensions: ['', '.js', '.jsx'],
    alias: {
    }
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
    new webpack.NoErrorsPlugin(),
    // Migrate static stuff into build.
    new TransferWebpackPlugin([
      { from: 'static', to: '' }
    ], __dirname),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ],
  module: {
    preLoaders: [
    ],
    loaders: [
      {
        test: /\.(jsx)$/,
        loaders: ['babel'],
        exclude: [nodeModulesPath]
      }
    ]
  }
};

module.exports = config;
