import mongoose, { Schema, Document } from "mongoose";

export type HiringApplicationStatus =
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "rejected"
  | "hired";

export interface IHiringAnswer {
  fieldKey: string;
  label: string;
  type: string;
  value: string;
}

export interface IHiringApplicationUpload {
  fieldKey: string;
  label: string;
  uploadId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  size: number;
  kind: string;
}

/**
 * A submitted job application. Stores a snapshot of the form configuration so
 * later edits to the form never change the meaning of historical answers.
 */
export interface IHiringApplication extends Document {
  applicationId: string;
  form: mongoose.Types.ObjectId;
  formSnapshot: {
    title: string;
    slug: string;
    subtitle?: string;
    description: string;
    instructions?: string;
    fields: {
      key: string;
      label: string;
      type: string;
      required: boolean;
    }[];
  };
  applicant: mongoose.Types.ObjectId;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  answers: IHiringAnswer[];
  uploads: IHiringApplicationUpload[];
  status: HiringApplicationStatus;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HiringAnswerSchema = new Schema<IHiringAnswer>(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const HiringApplicationUploadSchema = new Schema<IHiringApplicationUpload>(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    uploadId: {
      type: Schema.Types.ObjectId,
      ref: "HiringUpload",
      required: true,
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    kind: { type: String, required: true },
  },
  { _id: false }
);

const HiringApplicationSchema = new Schema<IHiringApplication>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    form: {
      type: Schema.Types.ObjectId,
      ref: "HiringForm",
      required: true,
      index: true,
    },
    formSnapshot: {
      title: { type: String, required: true },
      slug: { type: String, required: true },
      subtitle: { type: String },
      description: { type: String, required: true },
      instructions: { type: String },
      fields: { type: [Schema.Types.Mixed], default: [] },
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String },
    applicantPhone: { type: String },
    answers: { type: [HiringAnswerSchema], default: [] },
    uploads: { type: [HiringApplicationUploadSchema], default: [] },
    status: {
      type: String,
      enum: ["submitted", "under_review", "shortlisted", "rejected", "hired"],
      default: "submitted",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** One application per user per form — also enforced in the service layer. */
HiringApplicationSchema.index({ form: 1, applicant: 1 }, { unique: true });

export default mongoose.models.HiringApplication ||
  mongoose.model<IHiringApplication>(
    "HiringApplication",
    HiringApplicationSchema
  );
