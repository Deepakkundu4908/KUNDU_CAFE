const multer = require('multer');
const path = require('path');
const fs = require('fs');

const IMAGE_UPLOADS_DIR = path.join(__dirname, '../public/images');
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const ensureImageDirectory = () => {
  if (!fs.existsSync(IMAGE_UPLOADS_DIR)) {
    fs.mkdirSync(IMAGE_UPLOADS_DIR, { recursive: true });
  }
};

ensureImageDirectory();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureImageDirectory();
    cb(null, IMAGE_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'image';

    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

upload.ensureImageDirectory = ensureImageDirectory;
upload.imageUploadsDir = IMAGE_UPLOADS_DIR;

module.exports = upload;
