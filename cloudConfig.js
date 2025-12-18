const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'destiny',
    allowedFormats: ["png","jpg","jpeg","webp","svg","gif","mp4","mov","avi","mkv"],
  },
});

module.exports = {cloudinary, storage};
