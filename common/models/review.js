'use strict';
let airtableBase = require('../../server/airtable-setup');

module.exports = function(Review) {
  Review.remoteMethod('checkCustomerPhoneNumber', {
    http: {
      path: '/check-customer-phone-number',
      verb: 'get',
    },
    accepts: [
      {
        arg: 'phone',
        type: 'string',
      },
      {
        arg: 'userAgentId',
        type: 'string',
      },
    ],
    returns: [
      {
        arg: 'success',
        type: 'boolean',
      },
      {
        arg: 'message',
        type: 'string',
      },
    ],
    description: 'check the phone number of user is corrected',
  });

  Review.checkCustomerPhoneNumber = function(phone, userAgentId, cb) {
    let app = Review.app;
    let User = app.models.user;

    let response = {
      message: 'tetap tenang dan tetap semangat',
      success: false,
    }

    User.findById(userAgentId, {
      include: ['profile'],
    }).then(userDetail => {
      if (!userDetail) {
        response.message = `user with ID ${userAgentId} are not found`;
        return cb(null, response.success, response.message);
      }
      let userObj = JSON.parse(JSON.stringify(userDetail));

      // check if phone is the same with data in airtable
      airtableBase('Customers').select({
        filterByFormula: '{Phone} = ' + phone,
      }).eachPage(function page(records, fetchNextPage){
        let recordsFromAirtable = JSON.parse(JSON.stringify(records));
        
        if (recordsFromAirtable.length == 0) {
          response.message = `nomor telefon ${phone} tidak terdaftar sebagai nasabah dari agen ${userObj.profile.name}`;
          return cb(null, response.success, response.message);
        } else {
          response.success = true;
          response.message = `benar ${phone} adalah nasabah ${userObj.profile.name}`;
          return cb(null, response.success, response.message);
        }
      });
    }).catch(err => {
      console.log('error : ', err);
      response.message = 'error when find user by id';
      return cb(null, response.success, response.message);
    })
  }
};