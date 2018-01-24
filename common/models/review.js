'use strict';
let axios = require('axios');
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

  Review.afterRemote('checkCustomerPhoneNumber', (context, remoteMethodOutput, next) => {
    let messageContent = `Hai, kamu baru saja melakukan review, jika tidak merasa melakukan, klik disini untuk menyunting`;
    axios.get(`https://reguler.zenziva.net/apps/smsapi.php?userkey=047sfc&passkey=${remoteMethodOutput.phone}&nohp=${remoteMethodOutput.comment}&pesan=${messageContent}`)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
  })
};