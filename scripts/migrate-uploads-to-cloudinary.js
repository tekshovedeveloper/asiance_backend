require('dotenv').config();

const { Blob } = require('node:buffer');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const API_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(API_ROOT, '..');
const LOCAL_UPLOAD_DIRS = [
  path.join(API_ROOT, 'uploads'),
  path.join(PROJECT_ROOT, 'web', 'uploads'),
];
const MAX_UPLOAD_FILE_SIZE_MB = 10;
const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
const UPLOAD_TOO_LARGE_MESSAGE = 'This file is too large. Please upload a file that is 10 MB or smaller.';

const MIME_TYPES = {
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function requiredEnv(key) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not configured.`);
  }

  return value;
}

function signParams(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

async function uploadToCloudinary(filePath, originalName, folder) {
  const cloudName = requiredEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = requiredEnv('CLOUDINARY_API_KEY');
  const apiSecret = requiredEnv('CLOUDINARY_API_SECRET');
  const timestamp = Math.round(Date.now() / 1000);
  const signedParams = {
    folder,
    timestamp,
    unique_filename: true,
    use_filename: true,
  };
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(originalName).toLowerCase();
  const form = new FormData();

  form.append(
    'file',
    new Blob([buffer], { type: MIME_TYPES[extension] || 'application/octet-stream' }),
    originalName,
  );
  form.append('api_key', apiKey);

  for (const [key, value] of Object.entries(signedParams)) {
    form.append(key, String(value));
  }

  form.append('signature', signParams(signedParams, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.secure_url) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : `Cloudinary upload failed for ${filePath}`;
    throw new Error(message);
  }

  return data.secure_url;
}

async function walkFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function withoutQueryOrHash(value) {
  return value.split(/[?#]/)[0];
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function localReferenceKeys(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const raw = decodePath(withoutQueryOrHash(value.trim()));
  let pathname = raw;

  try {
    pathname = decodePath(new URL(raw).pathname);
  } catch {
    pathname = raw;
  }

  const normalized = pathname.replace(/\\/g, '/');
  const candidates = [];
  const addCandidate = (candidate) => {
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };
  const markers = [
    { marker: '/api/uploads/', prefixes: ['api/uploads/', 'uploads/'] },
    { marker: 'api/uploads/', prefixes: ['api/uploads/', 'uploads/'] },
    { marker: '/uploads/', prefixes: ['web/uploads/', 'uploads/'] },
    { marker: 'web/uploads/', prefixes: ['web/uploads/', 'uploads/'] },
    { marker: 'uploads/', prefixes: ['uploads/'] },
  ];

  for (const { marker, prefixes } of markers) {
    const index = normalized.indexOf(marker);

    if (index >= 0) {
      const relative = normalized.slice(index + marker.length).replace(/^\/+/, '');

      if (relative) {
        for (const prefix of prefixes) {
          addCandidate(`${prefix}${relative}`);
        }

        addCandidate(relative);
        addCandidate(path.posix.basename(relative));
      }
    }
  }

  return candidates;
}

function addIndexEntry(index, key, filePath) {
  const normalizedKey = decodePath(toPosix(key)).replace(/^\/+/, '');

  if (!normalizedKey) {
    return;
  }

  if (!index.has(normalizedKey)) {
    index.set(normalizedKey, filePath);
    return;
  }

  if (index.get(normalizedKey) !== filePath) {
    index.set(normalizedKey, null);
  }
}

function indexFile(fileIndex, rootDir, filePath) {
  const relative = toPosix(path.relative(rootDir, filePath));
  const filename = path.basename(filePath);

  addIndexEntry(fileIndex, relative, filePath);
  addIndexEntry(fileIndex, filename, filePath);

  if (rootDir.endsWith(`${path.sep}api${path.sep}uploads`)) {
    addIndexEntry(fileIndex, `api/uploads/${relative}`, filePath);
    addIndexEntry(fileIndex, `uploads/${relative}`, filePath);
  }

  if (rootDir.endsWith(`${path.sep}web${path.sep}uploads`)) {
    addIndexEntry(fileIndex, `web/uploads/${relative}`, filePath);
    addIndexEntry(fileIndex, `uploads/${relative}`, filePath);
  }
}

async function buildLocalFileIndex() {
  const fileIndex = new Map();
  const files = [];

  for (const dir of LOCAL_UPLOAD_DIRS) {
    const dirFiles = await walkFiles(dir);

    for (const filePath of dirFiles) {
      files.push({ rootDir: dir, filePath });
      indexFile(fileIndex, dir, filePath);
    }
  }

  return { fileIndex, files };
}

async function uploadLocalFiles(files) {
  const folder = process.env.CLOUDINARY_FOLDER || 'asiance/uploads';
  const uploads = new Map();
  const skipped = [];

  for (const { rootDir, filePath } of files) {
    const relative = toPosix(path.relative(rootDir, filePath));
    const originalName = path.basename(filePath);
    const stat = await fs.stat(filePath);

    if (stat.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      skipped.push({ filePath, relative, size: stat.size });
      process.stdout.write(`Skipping ${relative}: ${UPLOAD_TOO_LARGE_MESSAGE}\n`);
      continue;
    }

    process.stdout.write(`Uploading ${relative}... `);
    const secureUrl = await uploadToCloudinary(filePath, originalName, folder);
    uploads.set(filePath, secureUrl);
    process.stdout.write('done\n');
  }

  return { uploads, skipped };
}

function replacementForLocalReference(value, fileIndex, uploadedUrls) {
  const keys = localReferenceKeys(value);

  for (const key of keys) {
    const filePath = fileIndex.get(key);

    if (filePath && uploadedUrls.has(filePath)) {
      return uploadedUrls.get(filePath);
    }
  }

  return null;
}

function isTraversableObject(value) {
  return value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value) &&
    !value._bsontype;
}

function collectUpdates(value, currentPath, updates, fileIndex, uploadedUrls) {
  if (typeof value === 'string') {
    const replacement = replacementForLocalReference(value, fileIndex, uploadedUrls);

    if (replacement && currentPath) {
      updates[currentPath] = replacement;
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectUpdates(item, currentPath ? `${currentPath}.${index}` : String(index), updates, fileIndex, uploadedUrls);
    });
    return;
  }

  if (!isTraversableObject(value)) {
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    if (key === '_id') {
      continue;
    }

    collectUpdates(item, currentPath ? `${currentPath}.${key}` : key, updates, fileIndex, uploadedUrls);
  }
}

async function updateMongoReferences(fileIndex, uploadedUrls) {
  await mongoose.connect(requiredEnv('MONGO_URI'));

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  let documentsUpdated = 0;
  let fieldsUpdated = 0;

  for (const collectionInfo of collections) {
    const collection = db.collection(collectionInfo.name);
    const cursor = collection.find({});
    let collectionDocumentsUpdated = 0;
    let collectionFieldsUpdated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const updates = {};

      collectUpdates(doc, '', updates, fileIndex, uploadedUrls);

      if (Object.keys(updates).length > 0) {
        await collection.updateOne({ _id: doc._id }, { $set: updates });
        documentsUpdated += 1;
        fieldsUpdated += Object.keys(updates).length;
        collectionDocumentsUpdated += 1;
        collectionFieldsUpdated += Object.keys(updates).length;
      }
    }

    if (collectionDocumentsUpdated > 0) {
      process.stdout.write(
        `Updated ${collectionDocumentsUpdated} document(s), ${collectionFieldsUpdated} field(s) in ${collectionInfo.name}\n`,
      );
    }
  }

  await mongoose.disconnect();

  return { documentsUpdated, fieldsUpdated };
}

async function main() {
  const { fileIndex, files } = await buildLocalFileIndex();

  if (files.length === 0) {
    process.stdout.write('No local files found in api/uploads or web/uploads.\n');
    return;
  }

  process.stdout.write(`Found ${files.length} local upload file(s).\n`);
  const { uploads: uploadedUrls, skipped } = await uploadLocalFiles(files);
  const result = await updateMongoReferences(fileIndex, uploadedUrls);

  process.stdout.write(
    `Migration complete. Updated ${result.documentsUpdated} document(s) and ${result.fieldsUpdated} field(s).\n`,
  );

  if (skipped.length > 0) {
    process.stdout.write(
      `Skipped ${skipped.length} file(s) larger than ${MAX_UPLOAD_FILE_SIZE_MB} MB. These MongoDB links were not updated.\n`,
    );

    for (const file of skipped) {
      process.stdout.write(`- ${file.relative} (${Math.ceil(file.size / 1024 / 1024)} MB)\n`);
    }
  }

  process.stdout.write('Local files were not deleted. Remove them only after verifying the new Cloudinary URLs.\n');
}

main().catch(async (error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(1);
});
