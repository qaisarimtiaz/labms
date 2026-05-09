import mongoose, { Document, Schema } from 'mongoose';

export interface ILabTest extends Document {
  code: string;
  name: string;
  price: number;
  description?: string;
  type?: string;
  reportFormat?: string;
  template?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LabTestSchema = new Schema<ILabTest>({
  code: {
    type: String,
    required: [true, 'Test code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Test price is required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    trim: true,
    default: ''
  },
  reportFormat: {
    type: String,
    trim: true,
    default: 'standard',
    enum: [
      'standard',
      'ana-23',
      'ana-mi2',
      'ena',
      'autoimmune-liver',
      'myopathies',
      'myopathies-hmgcr',
      'neuronal-profile',
      'paraneoplastic-profile',
      'systemic-sclerosis'
    ]
  },
  template: {
    type: Schema.Types.ObjectId,
    ref: 'TestTemplate',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries (code index is already created by unique: true)
LabTestSchema.index({ name: 1 });
LabTestSchema.index({ price: 1 });

const LabTest = mongoose.models.LabTest || mongoose.model<ILabTest>("LabTest", LabTestSchema);
export default LabTest;