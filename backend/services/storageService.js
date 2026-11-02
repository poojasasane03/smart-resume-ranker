const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "../uploads");

// Saves the file under a random name and returns that name
async function saveFile(buffer, ext) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), buffer, { flag: "wx" }); // wx: never overwrite
  return storedName;
}

async function deleteFile(storedName) {
  // path.basename guarantees the name can never point outside the uploads folder
  const safeName = path.basename(storedName);
  await fs.unlink(path.join(UPLOAD_DIR, safeName)).catch(() => {
    // already gone, nothing to do
  });
}

module.exports = { saveFile, deleteFile };
