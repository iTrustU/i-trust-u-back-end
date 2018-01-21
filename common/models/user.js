'use strict';
let firebaseAdmin = require('../../server/firebase-admin.js');
console.log('the firebase admin : ', firebaseAdmin);

module.exports = function(User) {
  var Airtable = require('airtable');
  var base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY,
  }).base(process.env.AIRTABLE_BASE);

  // Remove existing validations for email
  delete User.validations.email;

  // Adds email format validation
  // Note custom validator because validatesFormat with regex will return false on a null value
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  User.validate('email', function (err) { if (!re.test(this.email) && this.email !== undefined) err(); }, {message: 'Email format is invalid'});

  // Adds email uniqueness validation
  User.validatesUniquenessOf('email', {message: 'Email already exists'});

  User.getAllUserBasedOnRole = function (roleName, cb) {
    let app = User.app;
    let Role = app.models.Role
    let RoleMapping = app.models.RoleMapping
    let Profile = app.models.Profile;

    Role.findOne({
      where: {
        name: roleName
      },
      include: 'users'
    }).then(role => {
      console.log('detail role : ', role);
      cb(null, role)
    }).catch(err => {
      console.log('err when trying to get role ', err);
    })
  }

  User.remoteMethod('getAllUserBasedOnRole', {
    http: {
      path: '/all-user-based-on-role',
      verb: 'get',
    },
    accepts: {
      arg: 'roleName',
      type: 'string',
    },
    returns: {
      arg: 'users',
      type: 'array',
    },
    description: 'Get all users based on role',
  })

  User.isAlreadyRegistered = function(email, cb) {
    User.findOne({
      where: {
        email: email,
      },
      include: "profile",
    }, function(err, user) {
      if (err) cb(err);
      cb(null, user);
    })
  }

  User.remoteMethod('isAlreadyRegistered', {
    http: {
      path: '/isAlreadyRegistered',
      verb: 'get',
    },
    accepts: {
      arg: 'email',
      type: 'string',
    },
    returns: {
      arg: 'userDetail',
      type: 'object',
    },
    description: "Check that user already registered by email ?",
  })

  User.customLogin = function (email, password, cb) {
    let response = {
      success: false,
      message: '',
    };

    User.login({
      email: email,
      password: password,
    }, 'user', (err, res) => {
      if (err) {
        response.message = 'email atau password salah : ' + err;
        console.log('Err : ', err);
        return cb(null, {}, null, response.success, response.message);
      }

      User.findById(res.userId, {
        include: ['profile', 'roles']
      }).then((userDetail) => {
        // add profile property even it empty
        let userDetailObj = JSON.parse(JSON.stringify(userDetail))
        if (!userDetailObj.profile) {
          userDetailObj.profile = {}
        }
        response.message = 'sukses masuk kedalam sistem';
        response.success = true;
        cb(null, userDetailObj, res.id, response.success, response.message);
      })
    })
  }

  User.remoteMethod('customLogin', {
    http: {
      path: '/custom-login',
      verb: 'POST'
    },
    accepts: [
      {
        arg: 'email',
        type: 'string'
      },
      {
        arg: 'password',
        type: 'string'
      }
    ],
    returns: [
      {
        arg: 'userDetail',
        type: 'object'
      },
      {
        arg: 'token',
        type: 'string'
      },
      {
        arg: 'success',
        type: 'boolean',
      },
      {
        arg: 'message',
        type: 'string',
      },
    ],
    description: "Custom response after login - include profile"
  })

  User.register = function(email, password, insuranceAgentId, cb) {
    let response = {
      success: false,
      message: 'something when wrong',
    };
    // check is there's at Insurace company database
    base('Agents').select({
      filterByFormula: '{InsuranceAgentId} = ' + insuranceAgentId,
    }).eachPage(function page(records, fetchNextPage) {
      console.log('the record : ', records);
      let recordsFromAirtable = JSON.parse(JSON.stringify(records))

      if (recordsFromAirtable.length == 0) {
        response.message = `Agent ID : ${insuranceAgentId} tidak ditemukan`;

        return cb(null, {}, null, response.success, response.message);
      }
      let fromInsuranceCompany = records[0].fields;

      User.create({
        email: email,
        password: password,
      }).then((user) => {
        console.log('sukses buat akun : ', user);

        let app = User.app;
        let Role = app.models.Role;
        let RoleMapping = app.models.RoleMapping;
        let Profile = app.models.Profile;

        Role.findOne({
          where: {
            name: 'agent',
          }
        }).then((role) => {
          if (!role) {
            response.message = 'role tidak ditemukan';
            return cb(null, {}, null, response.success, response.message);
          }

          RoleMapping.create({
            principalType: "USER",
            principalId: user.id,
            roleId: role.id
          }).then(roleMapped => {
            console.log('sukses mapping user to people');
            User.login({
              email: email,
              password: password,
            }, 'user', (err, res) => {
              if (err) {
                console.log('Err : ', err);
                response.message = 'error when trying to login the user';
                return cb(null, response, {}, response.success, response.message);
              }

              console.log('profile picture', fromInsuranceCompany.ProfilePicture[0].url)
              // save profile
              Profile.create({
                name: fromInsuranceCompany.Name,
                city: fromInsuranceCompany.City,
                profilePicture: fromInsuranceCompany.ProfilePicture[0].url,
                userId: res.userId,
              }).then((profileCreated) => {
                User.findById(res.userId, {
                  include: ['profile', 'roles']
                }).then((userDetail) => {
                  // add profile property even it empty

                  // base('Insurances').find(fromInsuranceCompany.)
                  let userDetailObj = JSON.parse(JSON.stringify(userDetail))
                  userDetailObj.fromInsuranceCompany = fromInsuranceCompany;
                  response.success = true;
                  response.message = 'sukses mendaftar';
                  return cb(null, userDetailObj, res.id, response.success, response.message);
                });
              }).catch(err => {
                response.message = 'create profile failed : ' + err;
                return cb(null, response, {}, response.success, response.message);
              });
            })
          }).catch(err => {
            console.log('error when trying to mapping the role :::::', err);
            return cb(null, response, {}, response.success, response.message);
          })
        }).catch(err => {
          console.log('err when find user : ', err);
          return cb(null, response, {}, response.success, response.message);
        })

      }).catch(err => {
        console.log('error buat akun : ', err);
        return cb(null, response, {}, response.success, response.message);
      })

    }, function done(err) {
      if (err) {
        console.error(err);
        return;
      }
    })

  }

  User.remoteMethod('register', {
    http: {
      path: '/register',
      verb: 'post'
    },
    accepts: [
      {
        arg: 'email',
        type: 'string'
      },
      {
        arg: 'password',
        type: 'string'
      },
      {
        arg: 'insuranceAgentId',
        type: 'string',
      }
    ],
    returns: [
      {
        arg: 'userDetail',
        type: 'object'
      },
      {
        arg: "token",
        type: 'string'
      },
      {
        arg: 'success',
        type: 'boolean'
      },
      {
        arg: 'message',
        type: 'string'
      },
    ],
    description: "custom register for mobile app"
  })

  User.greet = function(msg, cb) {
    cb(null, 'Greetings... ' + msg);
  }

  User.remoteMethod('greet', {
    http: {
      path: '/greet',
      verb: 'get'
    },
    accepts: {arg: 'msg', type: 'string'},
    returns: {arg: 'greeting', type: 'string'},
    description: "Just trying to create remoteMethod"
  })

  User.updateDeviceToken = function(email, deviceToken, cb) {
    let app = User.app;
    let Profile = app.models.Profile;

    let response = {
      message: 'something when wrong',
      success: false,
    }
    User.findOne({
      where: {
        email: email,
      },
      include: 'profile',
    }).then(user => {
      if (!user) {
        response.message = 'user with email : ' + email;
        return cb(null, response.message, response.success);
      }

      let convertedUser = JSON.parse(JSON.stringify(user))

      console.log('the user : ', convertedUser, convertedUser.profile.id);
      let profile = new Profile();
      profile.setId(convertedUser.profile.id);
      console.log('the new profile instance : ', profile);
      profile.updateAttributes({deviceToken: deviceToken}, (err, newProfile) => {
        if (err) {
          response.message = 'err when update token, profile id : ' + convertedUser.profile.id + ' err : ' + err;
          return cb(null, response.message, response.success);
        }

        console.log('new profile ', newProfile);
        response.message = 'device token changed into ' + deviceToken;
        response.success = true;
        return cb(null, response.message, response.success);
      });
    }).catch(err => {
      response.message = 'error when trying to find a user : ' + err;
      console.log('err when trying to find a user : ', err);
      return cb(null, response.message, response.success);
    });
  }

  User.remoteMethod('updateDeviceToken', {
    http: {
      path: '/update-device-token',
      verb: 'post',
    },
    accepts: [
      { arg: 'email', type: 'string' },
      { arg: 'deviceToken', type: 'string'},
    ],
    returns: [
      { arg: 'message', type: 'string' },
      { arg: 'success', type: 'boolean' },
    ],
    description: "Update device token for Push Notification",
  });

  User.tryNotify = (userId, cb) => {
    let response = {
      success: false,
      message: 'somehting when wrong',
    };

    User.findById(userId, {
      include: ['profile'],
    }).then(userDetail => {
      if (!userDetail) {
        response.message = `user with ID ${userId} is not found `;
        return cb(null, response.message, response.success);
      }

      let convertedUser = JSON.parse(JSON.stringify(userDetail));
      var payload = {
        notification: {
          title: `Testing - ${convertedUser.profile.deviceToken}`,
          body: `User ID ${userId} - Device Token ${convertedUser.profile.deviceToken}`,
        },
        data: {
          reportId: convertedUser.profile.deviceToken,
        },
      };

      var options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24,
      };
        // Send a message to the device corresponding to the provided
      // registration token with the provided options.
      firebaseAdmin.messaging().sendToDevice([convertedUser.profile.deviceToken], payload, options)
        .then(function(response) {
          if (response.failureCount > 0) {
            response.message = 'notification cannot send, please check this device token ID : ' + convertedUser.profile.deviceToken;
            response.success = false;
          } else if (response.successCount > 0) {
            response.message = 'successfully send to ' + convertedUser.profile.deviceToken;
            response.success = true;
          }

          console.log('Successfully sent message:', response);
          return cb(null, response.message, response.success);
        })
        .catch(function(error) {
          console.log('Error sending message: ', error);
          response.message = 'error sending message : ' + error;
          return cb(null, response.message, response.success);
      });
    }).catch(err => {
      response.message = `error when trying to query user : ${err} `;
      return cb(null, response.message, response.success);
    })
  }

  User.remoteMethod('tryNotify', {
    http: {
      path: '/try-notify',
      verb: 'post',
    },
    accepts: {
      arg: 'userId',
      type: 'string',
    },
    returns: [
      {
        arg: 'message',
        type: 'string',
      },
      {
        arg: 'success',
        type: 'boolean',
      },
    ],
    description: 'try to notify using post notification, make sure you already register the device token first (:',
  });
};
