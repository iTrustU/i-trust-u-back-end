'use strict';

let fs = require('fs');
let PDFDocument = require('pdfkit');
let cloudinary = require('../../server/cloudinary-setup');
let blobStream = require('blob-stream');


module.exports = function(Profile) {
  Profile.generateBusinessCard = function(userId, cb) {
    let app = Profile.app;
    let User = app.models.user;

    let response = {
      success: false,
      message: 'something went wrong',
      businessCardLink: '',
    }

    User.findById(userId, {
      include: ['profile', 'insuranceCompany'],
    }).then(userRaw => {
      let userObj = JSON.parse(JSON.stringify(userRaw));

      if (!userObj) {
        response.success = false;
        response.message = `user dengan id ${userId} tidak ditemukan`;
        cb(null, response.success, response.message, response.businessCardLink);
      }

      let doc = new PDFDocument({
        size: 'A8',
        layout: 'landscape',
        margin: 5,
      });
      let fullBusinessCardPath = process.env.PROJECT_PATH + '/assets/business-cards/' + userId  + '.pdf';

      doc.registerFont('OpenSans', process.env.PROJECT_PATH + '/assets/fonts/Open_Sans/OpenSans-Regular.ttf')
      doc.registerFont('OpenSansLight', process.env.PROJECT_PATH + '/assets/fonts/Open_Sans/OpenSans-Light.ttf')

      doc.pipe(fs.createWriteStream(fullBusinessCardPath));
      // draw some text
      doc.font('OpenSans')
        .fontSize(14)
        .text(userObj.profile.name, 20, 20);
      doc.font('OpenSansLight')
        .fontSize(9)
        .text(userObj.insuranceCompany.name, 20, 40);
      doc.font('OpenSans')
        .fontSize(7)
        .text('Phone : ' + userObj.profile.phone, 20, 100);  
      doc.font('OpenSans')
        .fontSize(7)
        .text('Email : ' + userObj.email, 20, 112); 
      doc.font('OpenSans')
        .fontSize(7)
        .text('Alamat : ' + userObj.profile.city, 20, 125); 
      doc.font('OpenSans')
        .fontSize(5)
        .text('Temukan profil dan ulasan seputar saya di iTrustU', 130, 75, {width: 70, align: 'center'}); 
      doc.image(process.env.PROJECT_PATH + '/assets/images/logos/aaji-logo.jpg', 150, 20, {width: 40});
      doc.image(process.env.PROJECT_PATH + '/assets/images/qr/qr-' + userId + '.png', 140, 90, {width: 50});

      doc.end();
      console.log('done generated');
      let stream = doc.pipe(blobStream());

      stream.on('finish', () => {
        console.log('finished ')
        cloudinary.v2.uploader.upload(fullBusinessCardPath, {public_id: userId}, (error, result) => {
          console.log('result : ', result);
          if (error) {
            response.message = error.message;
            cb(null, response.success, response.message, response.businessCardLink)
          }
  
          Profile.upsertWithWhere({
            userId: userId,
          }, {
            businessCardLink: result.url,
          }).then(profile => {
            console.log('profile update with qr image : ', profile)
            if (result.error) {
              response.message = result.error.message;
              cb(null, response.success, response.message, response.businessCardLink)
            }
            response.success = true;
            response.message = 'berhasi membuat kartu nama';
            response.businessCardLink = result.url;
            cb(null, response.success, response.message, response.businessCardLink)
          }).catch(err => {
            console.log('error when update profile : ', err)
            cb(null, response.success, response.message, response.businessCardLink)
          })
        })
      })
    })
  }

  Profile.remoteMethod('generateBusinessCard', {
    http: {
      path: '/generate-business-card',
      verb: 'GET',
    },
    accepts: [
      {
        arg: 'userId',
        type: 'string',
      }
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
      {
        arg: 'businessCardLink',
        type: 'string',
      },
    ],
    description: 'Generate Business Card',
  })
};
