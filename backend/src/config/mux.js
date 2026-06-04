// config/mux.js
const Mux = require('@mux/mux-node');

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

module.exports = mux;
