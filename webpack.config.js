const path = require('path');
const NODE_ENV = process.env.NODE_ENV || 'development';
const env = require('dotenv').config({ path: path.join(__dirname, `${NODE_ENV}.env`) });
const { DefinePlugin } = require('webpack');
const build = require('./src/build');

console.log(`⚙️  Using ${NODE_ENV} environment to build Piccadilly on Node v${process.versions.node}`);

module.exports = {
    mode: 'none',
    target: 'webworker',
    entry: './src/index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'worker.js',
    },
    plugins: [
        {
            apply: compiler => compiler.hooks.beforeRun.tapPromise('PrepareBuildBeforeWebpack', build),
        },

        new DefinePlugin(Object.entries(env.parsed).reduce((obj, [ key, val ]) => {
            obj[`process.env.${key}`] = JSON.stringify(val);
            return obj;
        }, { 'process.env.NODE_ENV': JSON.stringify(NODE_ENV) })),
    ],
    module: {
        rules: [
            {
                test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader',
            },
        ],
    },
};
