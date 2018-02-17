'use strict';

let QRCode = require('qrcode');
let cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'itrustu', 
  api_key: '922893819127145', 
  api_secret: 'AlboUW3Mil89RyOOmCnXUY5cqYA' 
})

console.log(' process.env.PWD : ', process.env.PWD)
let userId = 'test';
let fileLocation = '../assets/images/qr/' + userId + '.png'
QRCode.toFile(fileLocation, 'https://itrustu-a10b5.firebaseapp.com/profile/' + userId, {}, function(err, url) {
  cloudinary.uploader.upload(fileLocation, function(result) { 
    console.log(result) 
  });
  console.log('error : ', err)
  console.log('file : ', url);

})