const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");

// Load envinronment variables from .env file
dotenv.config();

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "./static/frontend"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],  // so that it understands css files
      },
    ],
  },
  optimization: {
    minimize: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),   // this loads the variables from .env
    }),
  ],
};


// plugins: [
//   new webpack.DefinePlugin({
//     "process.env": {
//       // This has effect on the react lib size
//       NODE_ENV: JSON.stringify("development"),
//     },
//   }),
// ],