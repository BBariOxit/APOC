import "server-only";

import {
  type InferSchemaType,
  type Model,
  Schema,
  model,
  models,
} from "mongoose";

import {
  normalizeUsernameKey,
  normalizedEmailSchema,
  passwordHashSchema,
  usernameKeySchema,
  usernameSchema,
} from "@/server/validation/account";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    usernameKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      select: false,
    },
    passwordHash: {
      type: String,
      minlength: 20,
      maxlength: 255,
      select: false,
    },
    role: {
      type: String,
      enum: ["player", "admin"],
      required: true,
      default: "player",
    },
    status: {
      type: String,
      enum: ["active", "banned"],
      required: true,
      default: "active",
    },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { collection: "users", timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ usernameKey: 1 }, { unique: true });
userSchema.index({ status: 1, createdAt: -1 });

userSchema.pre("validate", function normalizeAndValidateUser() {
  const email = normalizedEmailSchema.safeParse(this.email);
  if (!email.success) {
    this.invalidate("email", email.error.issues[0]?.message ?? "invalid email");
  } else {
    this.email = email.data;
  }

  const username = usernameSchema.safeParse(this.username);
  if (!username.success) {
    this.invalidate(
      "username",
      username.error.issues[0]?.message ?? "invalid username",
    );
  } else {
    this.username = username.data;
    this.usernameKey = normalizeUsernameKey(username.data);
  }

  const usernameKey = usernameKeySchema.safeParse(this.usernameKey);
  if (!usernameKey.success) {
    this.invalidate(
      "usernameKey",
      usernameKey.error.issues[0]?.message ?? "invalid username key",
    );
  }

  if (this.passwordHash !== undefined) {
    const passwordHash = passwordHashSchema.safeParse(this.passwordHash);
    if (!passwordHash.success) {
      this.invalidate(
        "passwordHash",
        passwordHash.error.issues[0]?.message ?? "invalid password hash",
      );
    }
  }
});

export type User = InferSchemaType<typeof userSchema>;

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>("User", userSchema);
