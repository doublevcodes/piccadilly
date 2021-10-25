const path = require('path');
const NODE_ENV = process.env.NODE_ENV || "development";
const env = require('dotenv').config({ path: path.join(__dirname, `${NODE_ENV}.env`) });
const { DefinePlugin } = require('webpack')
const build = require("./src/build")

console.log(`Using ${NODE_ENV} environment to build Piccadilly on Node v${process.versions.node}`)