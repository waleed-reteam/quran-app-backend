import mongoose, { Schema, Document } from 'mongoose';

export enum OtpType {
  VERIFY_ACCOUNT_OTP = 'verify-account-otp',
  RESET_PASSWORD = 'reset-password',
  PHONE_LOGIN_OTP = 'phone-login-otp',
  UPDATE_PROFILE = 'update-profile',
  RECOVER_ACCOUNT = 'recover-account',
}

export enum IdentifierType {
  EMAIL = 'email',
  PHONE = 'phone',
  USERID = 'user_id',
}

export interface IOtp extends Document {
  type: OtpType;
  code: string;
  identifier: string;
  identifier_type: IdentifierType;
  is_verified: boolean;
  expires_at: Date;
  data: Record<string, any>;
  isExpired(): boolean;
}

const OtpSchema = new Schema<IOtp>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(OtpType),
    },
    code: {
      type: String,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
    },
    identifier_type: {
      type: String,
      required: true,
      enum: Object.values(IdentifierType),
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    expires_at: {
      type: Date,
      default: null,
    },
    data: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
OtpSchema.index({ identifier: 1, type: 1 });
OtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Method to check if OTP is expired
OtpSchema.methods.isExpired = function (): boolean {
  if (!this.expires_at) {
    return false;
  }
  return this.expires_at < new Date();
};

export default mongoose.model<IOtp>('Otp', OtpSchema);

