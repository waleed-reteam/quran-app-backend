import mongoose, { Schema, Document } from 'mongoose';

export interface IDua extends Document {
  title: string;
  category: 'daily' | 'after-salah' | 'morning' | 'evening' | 'selected' | 'other';
  arabic: string;
  latin?: string;
  transliteration?: string;
  translation: string;
  notes?: string;
  benefits?: string;
  source?: string;
  audioUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DuaSchema = new Schema<IDua>(
  {
    title: { type: String, required: true },
    category: { 
      type: String, 
      required: true,
      enum: ['daily', 'after-salah', 'morning', 'evening', 'selected', 'other']
    },
    arabic: { type: String, required: true },
    latin: { type: String },
    transliteration: { type: String },
    translation: { type: String, required: true },
    notes: { type: String },
    benefits: { type: String },
    source: { type: String },
    audioUrl: { type: String },
    tags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
DuaSchema.index({ category: 1 });
DuaSchema.index({ title: 'text', arabic: 'text', translation: 'text' });
DuaSchema.index({ tags: 1 });

export default mongoose.model<IDua>('Dua', DuaSchema);

