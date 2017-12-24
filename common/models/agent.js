'use strict';

const algoliasearch = require('algoliasearch');

let client = algoliasearch('4HJ26M6YLI', '227758b75aa72cb9749c2db4004f5dce');

module.exports = function(Agent) {
  Agent.observe('after save', function logQuery(ctx, next) {
    if (ctx.instance) {
      console.log('ctx.instance : ', ctx.instance);


      

    }
  })
};
