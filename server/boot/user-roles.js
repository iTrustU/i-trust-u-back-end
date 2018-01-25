'use strict';

module.exports = function(server) {
  var User = server.models.user;
  var Role = server.models.Role;
  var RoleMapping = server.models.RoleMapping;

  var users = [
    {email: 'diky@i-trust-u.com', password: 'secret'},
    {email: 'ego@i-trust-u.com', password: 'secret'}
  ];

  User.findOne({
    where: {
      email: 'imposible@tobethesame.com',
    }
  }).then(user => {
    if (!user) {
      User.create(users, function(err, users) {
          if (err) {return console.log(err);}

          let roles = [{
            name: 'admin',
            description: 'Can doing anything'
          },
          {
            name: 'agent',
            description: 'as agent insurence'
          }]

          //create the admin role
          Role.create(roles, function(err, roles) {
            if (err) {console.log(err);}

            roles.map((role, index) => {
              role.principals.create({
                principalType: RoleMapping.USER,
                principalId: users[index].id
              }).then(() => {
                console.log('sukses set ', users[index].email, ' as ', role.name);
              })
            })
          });
        });
    }
  })

  RoleMapping.belongsTo(User);
  User.hasMany(RoleMapping, {foreignKey: 'principalId'});
  Role.hasMany(User, {through: RoleMapping, foreignKey: 'roleId'});
};
