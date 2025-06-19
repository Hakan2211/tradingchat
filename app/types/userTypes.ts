import type {
  User as PrismaUser,
  UserImage as PrismaUserImage,
} from '@prisma/client';

// Define a subset of User type for client-side use (without password)
export type User = Omit<PrismaUser, 'password'> & {
  image?: {
    url: string;
  } | null;
};
