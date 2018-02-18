'use strict';

let QRCode = require('qrcode');
let cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: '', 
  api_key: '', 
  api_secret: '' 
})

console.log(' process.env.PWD : ', process.env.PWD)
let userId = '5a844026c8d67113bee3b5ae';
let fileLocation = './assets/images/qr/qr-' + userId + '.png'
QRCode.toFile(fileLocation, 'https://itrustu-a10b5.firebaseapp.com/profile/' + userId, {}, function(err, url) {
  // cloudinary.uploader.upload(fileLocation, function(result) { 
  //   console.log(result) 
  // });
  console.log('error : ', err)
  console.log('file : ', url);

})