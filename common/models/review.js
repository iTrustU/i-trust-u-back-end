'use strict';
let axios = require('axios');
let _ = require('lodash');
let airtableBase = require('../../server/airtable-setup');
let firebaseAdmin = require('../../server/firebase-admin.js');

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
      message: 'tetap tenang dan tetap semangat dan tetep bersyukur ini semua hanya titipan sang ilahi',
      success: false, 
    };
      
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
              // save
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

  function checkPhoneNumberOnAirTable(phoneNumber) {

  }
  Review.afterRemote('create', (context, remoteMethodOutput, next) => {
    console.log('hooked', remoteMethodOutput);
    console.log('hooked remoted raing', remoteMethodOutput.rating);
    let app = Review.app;
    let User = app.models.user;
    let Profile = app.models.Profile;

    User.findById(remoteMethodOutput.userId, {
      include: ['profile'],
    }).then(userDetail => {
      let userObj = JSON.parse(JSON.stringify(userDetail));
      let messageContent = `Hai, kamu baru saja me-review ${userObj.profile.name}, jika tidak merasa melakukan, klik tautan bertikut untuk menyunting`;
      // calculate
      Review.find({
        where: {
          userId: userObj.id,
        },
      }).then(reviews => {
        // skip calculation when it first come 
        let reviewsObj = JSON.parse(JSON.stringify(reviews));
        let reviewsLength = reviewsObj.length;
        if (reviewsLength > 1) {
          let sumRating = _.sumBy(reviewsObj, 'rating');
          let finalRating = sumRating / reviewsLength;
          
          Profile.upsertWithWhere({
            userId: userObj.id,
          }, {
            finalRating: finalRating,
          }).then(newProfile => {
            console.log('the updated profile : ', newProfile)
          }).catch(err => {
            console.log('error when update profile')
          })
        }
      }).catch(err => {
        console.log('error when calculate : ', err);
      })
      
      // save
      axios.get(`https://reguler.zenziva.net/apps/smsapi.php?userkey=${process.env.ZENZIVA_USER_KEY}&passkey=${process.env.ZENZIVA_PASS_KEY}&nohp=${remoteMethodOutput.phone}&pesan=${messageContent}`)
      .then((response) => { 
        console.log(response.config);
      })
      .catch((error) => {
        console.log(error);
      });
      // push notification
      var payload = {
        notification: {
          title: `Halo ${userObj.profile.name}, Kamu baru dapat review lho!`,
          body: `Selamat ${userObj.profile.name} ada review bagus untuk mu di iTrustU!, cek segera`,
        },
        data: {
          userId: userObj.id,
          url: process.env.WEB_HOST + '/profile/' + userObj.id,
        },
      };

      var options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24,
      };

      // registration token with the provided options.
      firebaseAdmin.messaging().sendToDevice([userObj.profile.deviceToken], payload, options)
        .then(function(response) {
          if (response.failureCount > 0) {
            console.log('notification cannot send, please check this device token ID : ' + userObj.profile.deviceToken);

          } else if (response.successCount > 0) {
            console.log('successfully send to ' + userObj.profile.deviceToken);
          }

          console.log('Successfully sent message:', response);
        })
        .catch(function(error) {
          console.log('Error sending message: ', error);
      });
    })
    next();
  })
};