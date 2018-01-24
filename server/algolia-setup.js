'use strict';
const algoliasearch = require('algoliasearch');

let client = algoliasearch('4LH6EUNWWA', 'b439b75df3fbbc35b005b7958d70b0e5');
let algolia = client.initIndex('iTrustU');

module.exports = algolia;
