require('dotenv').config();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    legacyWpId: {
      type: Number,
      unique: true,
      sparse: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },

    avatar: {
      type: String,
      default: '',
    },

    cover: {
      type: String,
      default: '',
    },

    firstName: {
      type: String,
      default: '',
    },

    lastName: {
      type: String,
      default: '',
    },

    phone: {
      type: String,
      default: '',
    },

    country: {
      type: String,
      default: '',
    },

    isVerified: {
      type: Boolean,
      default: true,
    },

    bio: {
      type: String,
      default: '',
    },

    location: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      default: 'active now',
    },

    interests: {
      type: [String],
      default: [],
    },

    following: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    groups: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    passwordResetRequired: {
      type: Boolean,
      default: true,
    },

    source: {
      type: String,
      enum: ['app', 'wordpress'],
      default: 'wordpress',
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model('User', UserSchema, 'users');

function getMeta(metaMap, key, fallback = '') {
  return metaMap[key] || fallback;
}

function splitDisplayName(displayName = '') {
  const parts = displayName.trim().split(' ').filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: 'User',
      lastName: 'Account',
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: 'Account',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function makeHandle(value, legacyWpId) {
  const base = value || `user-${legacyWpId}`;

  return base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getUniqueHandle(baseHandle, email, legacyWpId) {
  let handle = baseHandle || `user-${legacyWpId}`;
  let counter = 1;

  while (true) {
    const existing = await User.findOne({ handle });

    if (!existing) {
      return handle;
    }

    if (existing.email === email) {
      return handle;
    }

    handle = `${baseHandle}-${legacyWpId}-${counter}`;
    counter++;
  }
}

async function migrateUsers() {
  let mysqlConnection;

  try {
    console.log('Connecting to MySQL...');

    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI);

    console.log('Connected to MySQL and MongoDB.');

    const [wpUsers] = await mysqlConnection.execute(`
      SELECT
        ID,
        user_login,
        user_email,
        display_name,
        user_registered,
        user_status
      FROM wp_users
      WHERE user_email IS NOT NULL
      AND user_email != ''
      ORDER BY ID ASC
    `);

    console.log(`Found ${wpUsers.length} WordPress users.`);

    let migrated = 0;
    let skipped = 0;

    for (const wpUser of wpUsers) {
      const email = wpUser.user_email.toLowerCase().trim();

      const existingUser = await User.findOne({ email });

      if (existingUser && existingUser.source !== 'wordpress' && !existingUser.legacyWpId) {
        console.log(`Skipped existing app user: ${email}`);
        skipped++;
        continue;
      }

      const [metaRows] = await mysqlConnection.execute(
        `
        SELECT meta_key, meta_value
        FROM wp_usermeta
        WHERE user_id = ?
        AND meta_key IN (
          'first_name',
          'last_name',
          'billing_phone',
          'billing_country'
        )
        `,
        [wpUser.ID],
      );

      const metaMap = {};

      for (const row of metaRows) {
        metaMap[row.meta_key] = row.meta_value;
      }

      const displayNameParts = splitDisplayName(wpUser.display_name);

      const firstName =
        getMeta(metaMap, 'first_name') ||
        displayNameParts.firstName ||
        'User';

      const lastName =
        getMeta(metaMap, 'last_name') ||
        displayNameParts.lastName ||
        'Account';

      const phone = getMeta(metaMap, 'billing_phone', '');

      const country =
        getMeta(metaMap, 'billing_country') || 'United States';

      const name = `${firstName} ${lastName}`.trim();

      const baseHandle = makeHandle(wpUser.user_login || name, wpUser.ID);
      const handle = existingUser?.handle || await getUniqueHandle(baseHandle, email, wpUser.ID);

      const randomPasswordHash = await bcrypt.hash(
        `wordpress-migrated-${wpUser.ID}-${Date.now()}`,
        12,
      );

      const userPayload = {
        legacyWpId: wpUser.ID,

        name,
        firstName,
        lastName,
        email,
        handle,
        phone,
        country,

        role: 'member',
        avatar: '',
        cover: '',

        isVerified: true,

        bio: '',
        location: '',
        status: 'active now',

        interests: [],
        following: [],
        groups: [],

        isBlocked: false,

        source: 'wordpress',

        updatedAt: new Date(),
      };

      const insertOnlyPayload = {
        passwordHash: randomPasswordHash,
        passwordResetRequired: true,
        createdAt: new Date(wpUser.user_registered),
      };

      await User.updateOne(
        { email },
        {
          $set: userPayload,
          $setOnInsert: insertOnlyPayload,
        },
        { upsert: true },
      );

      migrated++;
      console.log(`Migrated: ${email}`);
    }

    console.log('Migration completed.');
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }

    await mongoose.disconnect();
  }
}

migrateUsers();
