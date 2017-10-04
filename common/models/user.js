'use strict';

module.exports = function(User) {

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
      verb: 'get'
    },
    accepts: {
      arg: 'roleName',
      type: 'string'
    },
    returns: {
      arg: 'users',
      type: 'array'
    },
    description: 'Get all users based on role'
  })

  User.isAlreadyRegistered = function(email, cb) {
    User.findOne({
      where: {
        email: email
      },
      include: "profile"
    }, function(err, user) {
      if (err) cb(err)
      cb(null, user)
    })
  }

  User.remoteMethod('isAlreadyRegistered', {
    http: {
      path: '/isAlreadyRegistered',
      verb: 'get'
    },
    accepts: {
      arg: 'email',
      type: 'string'
    },
    returns: {
      arg: 'userDetail',
      type: 'object'
    },
    description: "Check that user already registered by email ?"
  })

  User.customLogin = function (email, password, cb) {
    User.login({
      email: email,
      password: password
    }, 'user', (err, res) => {
      if (err) {
        console.log('Err : ', err);
        return cb(err)
      }

      User.findById(res.userId, {
        include: ['profile', 'roles']
      }).then((userDetail) => {
        // add profile property even it empty
        let userDetailObj = JSON.parse(JSON.stringify(userDetail))
        if (!userDetailObj.profile) {
          userDetailObj.profile = {}
        }
        cb(null, userDetailObj, res.id)
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
      }
    ],
    description: "Custom response after login - include profile"
  })

  User.register = function(email, password, cb) {
    User.create({
      email: email,
      password: password
    }).then((user) => {
      console.log('sukses buat akun : ', user);

      let app = User.app;
      let Role = app.models.Role
      let RoleMapping = app.models.RoleMapping

      Role.findOne({
        where: {
          name: 'people'
        }
      }).then((role) => {
        RoleMapping.create({
          principalType: "USER",
          principalId: user.id,
          roleId: role.id
        }).then(roleMapped => {
          console.log('sukses mapping user to people');
          User.login({
            email: email,
            password: password
          }, 'user', (err, res) => {
            if (err) {
              console.log('Err : ', err);
              return cb(err)
            }

            User.findById(res.userId, {
              include: ['profile', 'roles']
            }).then((userDetail) => {
              // add profile property even it empty

              let userDetailObj = JSON.parse(JSON.stringify(userDetail))
              userDetailObj.profile = {}
              console.log('obj userDetail : ', userDetail);
              cb(null, userDetailObj, res.id)
            })
          })
        }).catch(err => {
          console.log('error when trying to mapping the role :::::', err);
          cb(err)
        })
      }).catch(err => {
        console.log('err when find user : ', err);
        cb(err)
      })

    }).catch(err => {
      console.log('error buat akun : ', err);
      cb(err)
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
      }
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
};
