import mongoose, { Schema, Document } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  contentType: 'quran' | 'hadith' | 'dua';
  contentId: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    contentType: {
      type: String,
      enum: ['quran', 'hadith', 'dua'],
      required: true,
    },
    contentId: {
      type: String,
      required: true,
    },
    note: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
BookmarkSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IBookmark>('Bookmark', BookmarkSchema);

