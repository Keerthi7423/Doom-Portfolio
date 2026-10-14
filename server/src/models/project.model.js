import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      required: [true, 'Tagline is required'],
      trim: true,
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Full Stack', 'Systems', '3D / Creative', 'AI / ML', 'DevOps'],
      default: 'Full Stack',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    coverImage: {
      url: {
        type: String,
        required: [true, 'Cover image URL is required'],
      },
      publicId: {
        type: String,
        required: [true, 'Cover image public ID is required'],
      },
    },
    liveUrl: {
      type: String,
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Index: Optimizes the public 3D portfolio query
// Fetches featured projects sorted by custom display rank and creation date
projectSchema.index({ featured: 1, order: 1, createdAt: -1 });

export const Project = mongoose.model('Project', projectSchema);
