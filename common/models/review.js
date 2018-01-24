'use strict';

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

      // check if phone is the same with data in airtable


    }).catch(err => {
      console.log('error : ', err);
      response.message = 'error when find user by id';
      return cb(null, response.success, response.message);
    })
  }
};