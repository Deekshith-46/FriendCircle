const multer = require('multer');

// Memory storage configuration
const memoryStorage = multer.memoryStorage();

const parser = multer({ storage: memoryStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const videoParser = multer({ storage: memoryStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const profileParser = multer({ storage: memoryStorage, limits: { fileSize: 50 * 1024 * 1024 } });

module.exports = { parser, videoParser, profileParser };
