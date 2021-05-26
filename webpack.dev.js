const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, './dist'),
    clean: true
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './dist',
    hot: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json'
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    // Used to decide resolve order when importing without extension value
    // Also tells webpack which file extensions should be resolved
    extensions: ['.ts', '.js', '...'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: 'tsconfig.json',
        // should be in sync with tsconfig & root extension array if allowing non-ts files
        extensions: ['.ts', '.js', '...']
      })
    ]
  },
  plugins: [
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, 'native'),
      outDir: path.resolve(__dirname, 'wasm'),
      outName: 'index'
    }),
    new HtmlWebpackPlugin({
      title: 'Project Grimstroke #1',
      cache: true,
      scriptLoading: 'defer'
    })
  ],
  experiments: {
    asyncWebAssembly: true
  }
};
