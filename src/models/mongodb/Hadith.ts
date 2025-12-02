import mongoose, { Schema, Document } from 'mongoose';

export interface IHadith extends Document {
  collectionName: string;
  book: string;
  bookNumber: number;
  hadithNumber: string;
  chapter: string;
  chapterNumber?: number;
  arabicText: string;
  englishText: string;
  urduText?: string;
  grade?: string;
  narrator?: string;
  tags?: string[];
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HadithSchema = new Schema<IHadith>(
  {
    collectionName: { 
      type: String, 
      required: true,
      enum: ['sahih-bukhari', 'sahih-muslim', 'sunan-abu-dawud', 'jami-at-tirmidhi', 'sunan-an-nasai', 'sunan-ibn-majah', 'muwatta-malik', 'musnad-ahmad', 'riyadh-as-salihin']
    },
    book: { type: String, required: true },
    bookNumber: { type: Number, required: true },
    hadithNumber: { type: String, required: true },
    chapter: { type: String, required: true },
    chapterNumber: { type: Number },
    arabicText: { type: String, required: true },
    englishText: { type: String, required: true },
    urduText: { type: String },
    grade: { type: String },
    narrator: { type: String },
    tags: [{ type: String }],
    audioUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
HadithSchema.index({ collectionName: 1, hadithNumber: 1 }, { unique: true });
HadithSchema.index({ collectionName: 1, book: 1 });
HadithSchema.index({ arabicText: 'text', englishText: 'text', urduText: 'text' });
HadithSchema.index({ tags: 1 });

export default mongoose.model<IHadith>('Hadith', HadithSchema);

