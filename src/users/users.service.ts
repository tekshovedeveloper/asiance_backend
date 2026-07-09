import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../common/slug';
import { User, UserDocument } from './user.schema';
import { UpdateMeDto } from './dto/update-me.dto';

export type CreateUserInput = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  passwordHash: string;
  isVerified?: boolean;

  handle?: string;
  role?: 'admin' | 'member';
  avatar?: string;
  cover?: string;
  bio?: string;
  location?: string;
  status?: string;
  interests?: string[];
  following?: any[];
  groups?: any[];
  isBlocked?: boolean;

  // WordPress migration fields
  legacyWpId?: number;
  passwordResetRequired?: boolean;
  source?: 'app' | 'wordpress';
};

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: CreateUserInput) {
    const handle = await this.uniqueHandle(slugify(input.name));
    try {
      const user = await this.userModel.create({ ...input, handle });
      return this.sanitize(user.toObject());
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictException('A member with this email already exists.');
      }
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).lean();
    if (!user) {
      throw new NotFoundException('Member not found.');
    }
    return this.sanitize(user);
  }

  async findByHandle(handle: string) {
    const user = await this.userModel.findOne({ handle: handle.toLowerCase() }).lean();
    if (!user) {
      throw new NotFoundException('Member not found.');
    }
    return this.sanitize(user);
  }

  async list(search?: string) {
    const query = search
      ? {
          $or: [
            { name: new RegExp(search, 'i') },
            { handle: new RegExp(search, 'i') },
            { bio: new RegExp(search, 'i') },
          ],
        }
      : {};

    const users = await this.userModel.find(query).sort({ createdAt: -1 }).limit(80).lean();
    return users.map((user) => this.sanitize(user));
  }

  async updateMe(id: string, input: Partial<User>) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .lean();
    if (!user) {
      throw new NotFoundException('Member not found.');
    }
    return this.sanitize(user);
  }

  async follow(memberId: string, targetId: string) {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new NotFoundException('Member not found.');
    }

    await this.userModel.findByIdAndUpdate(memberId, {
      $addToSet: { following: new Types.ObjectId(targetId) },
    });
    return this.findById(memberId);
  }

  sanitize(user: any) {
    if (!user) return user;
    const { passwordHash, __v, ...safe } = user;
    return {
      ...safe,
      id: user._id?.toString?.() ?? user.id,
      following: user.following?.map((id) => id.toString?.() ?? id) ?? [],
      groups: user.groups?.map((id) => id.toString?.() ?? id) ?? [],
    };
  }

  private async uniqueHandle(baseHandle: string) {
    const base = baseHandle || 'member';
    let handle = base;
    let suffix = 2;

    while (await this.userModel.exists({ handle })) {
      handle = `${base}-${suffix}`;
      suffix += 1;
    }

    return handle;
  }





  // ✅ return exactly what dashboard needs
  async getMe(id: string) {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('Member not found.');
    return this.toDashboardUser(this.sanitize(user));
  }

  // ✅ safe update: only allowed fields and map username->handle etc.
  async updateMeProfile(id: string, dto: UpdateMeDto) {
    const update: Partial<User> = {};

    if (typeof dto.name === 'string') update.name = dto.name.trim();
    if (typeof dto.bio === 'string') update.bio = dto.bio;
    if (typeof dto.email === 'string') update.email = dto.email.toLowerCase().trim();

    if (typeof dto.avatarUrl === 'string') update.avatar = dto.avatarUrl.trim();
    if (typeof dto.coverImageUrl === 'string') update.cover = dto.coverImageUrl.trim();

    // username -> handle (must be unique)
    if (typeof dto.username === 'string') {
      const nextHandle = dto.username.toLowerCase().trim().replace(/^@/, '');
      if (nextHandle.length) {
        const exists = await this.userModel.exists({ handle: nextHandle, _id: { $ne: id } });
        if (exists) throw new ConflictException('Username already taken.');
        update.handle = nextHandle;
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();

    if (!user) throw new NotFoundException('Member not found.');
    return this.toDashboardUser(this.sanitize(user));
  }

  async markVerified(email: string) {
    await this.userModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { isVerified: true } },
    );
  }

  async updatePasswordHash(email: string, passwordHash: string) {
    await this.userModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { passwordHash } },
    );
  }

  private toDashboardUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      username: user.handle ? `@${user.handle}` : '@member',
      email: user.email,
      lastActiveText: user.status || 'active now',
      bio: user.bio || '',
      avatarUrl: user.avatar || '',
      coverImageUrl: user.cover || '',
    };
  }


async updatePasswordAfterReset(email: string, passwordHash: string) {
  return this.userModel.updateOne(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        passwordHash,
        passwordResetRequired: false,
        isVerified: true,
      },
    },
  );
}



}


