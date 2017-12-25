'use strict';

const algoliasearch = require('algoliasearch');

let client = algoliasearch('4HJ26M6YLI', '227758b75aa72cb9749c2db4004f5dce');
let index = client.initIndex('iTrustU-demo');

module.exports = function(Agent) {
  Agent.observe('after save', function logQuery(ctx, next) {
    if (ctx.instance) {
      ctx.instance.objectID = ctx.instance.id;
      index.addObject(ctx.instance, (err, content) => {
        console.log('the content was submitted : ', content);
      });
    }
    next();
  });

  Agent.observe('after delete', function(ctx, next){
    console.log(`deleted`, ctx.where)
    let objectID = ctx.where.id.toString()
    index.deleteObject(objectID, (err) => {
      if (!err) {
        console.log('success delete an object on Algolia');
      }
    });
    next();
  });
};
