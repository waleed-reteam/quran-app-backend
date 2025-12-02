import mongoose, { Schema, Document } from 'mongoose';

export interface IAyah {
  number: number;
  numberInSurah: number;
  text: string;
  textArabic: string;
  translation?: string;
  transliteration?: string;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda?: boolean;
}

export interface ISurah extends Document {
  number: number;
  name: string;
  nameArabic: string;
  nameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
  ayahs: IAyah[];
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AyahSchema = new Schema<IAyah>({
  number: { type: Number, required: true },
  numberInSurah: { type: Number, required: true },
  text: { type: String, required: true },
  textArabic: { type: String, required: true },
  translation: { type: String },
  transliteration: { type: String },
  juz: { type: Number, required: true },
  manzil: { type: Number, required: true },
  page: { type: Number, required: true },
  ruku: { type: Number, required: true },
  hizbQuarter: { type: Number, required: true },
  sajda: { type: Boolean, default: false },
});

const SurahSchema = new Schema<ISurah>(
  {
    number: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    nameArabic: { type: String, required: true },
    nameTranslation: { type: String, required: true },
    revelationType: { type: String, enum: ['Meccan', 'Medinan'], required: true },
    numberOfAyahs: { type: Number, required: true },
    ayahs: [AyahSchema],
    audioUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
SurahSchema.index({ number: 1 });
SurahSchema.index({ name: 'text', nameArabic: 'text' });
SurahSchema.index({ 'ayahs.text': 'text', 'ayahs.translation': 'text' });

export default mongoose.model<ISurah>('Surah', SurahSchema);

