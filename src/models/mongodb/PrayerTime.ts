import mongoose, { Schema, Document } from 'mongoose';

export interface IPrayerTime extends Document {
  userId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  method: number;
  school: number;
  date: Date;
  timings: {
    Fajr?: string;
    Sunrise?: string;
    Dhuhr?: string;
    Asr?: string;
    Sunset?: string;
    Maghrib?: string;
    Isha?: string;
    Imsak?: string;
    Midnight?: string;
    [key: string]: string | undefined;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PrayerTimeSchema = new Schema<IPrayerTime>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    method: {
      type: Number,
      default: 2, // Muslim World League
    },
    school: {
      type: Number,
      default: 0, // Shafi
    },
    date: {
      type: Date,
      required: true,
    },
    timings: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
PrayerTimeSchema.index({ userId: 1, date: 1 });
PrayerTimeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPrayerTime>('PrayerTime', PrayerTimeSchema);

