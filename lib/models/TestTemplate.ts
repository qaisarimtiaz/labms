import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplateParameter {
  _id?: mongoose.Types.ObjectId;
  name: string;
  unit: string;
  referenceRange: string;
  minReferenceRange: string;
  maxReferenceRange: string;
  sequenceOrder: number;
}

export interface ITestTemplate extends Document {
  templateName: string;
  category: string;
  parameters: ITemplateParameter[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ParameterSchema = new Schema<ITemplateParameter>({
  name: {
    type: String,
    required: [true, 'Parameter name is required'],
    trim: true
  },
  unit: {
    type: String,
    trim: true,
    default: ''
  },
  referenceRange: {
    type: String,
    trim: true,
    default: ''
  },
  minReferenceRange: {
    type: String,
    trim: true,
    default: ''
  },
  maxReferenceRange: {
    type: String,
    trim: true,
    default: ''
  },
  sequenceOrder: {
    type: Number,
    default: 0
  }
}, { _id: true });

const TestTemplateSchema = new Schema<ITestTemplate>({
  templateName: {
    type: String,
    required: [true, 'Template name is required'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  parameters: {
    type: [ParameterSchema],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

TestTemplateSchema.index({ templateName: 1 });
TestTemplateSchema.index({ category: 1 });
TestTemplateSchema.index({ isActive: 1 });

const TestTemplate = mongoose.models.TestTemplate ||
  mongoose.model<ITestTemplate>('TestTemplate', TestTemplateSchema);

export default TestTemplate;
