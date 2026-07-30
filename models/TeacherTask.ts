import mongoose, { type Model, Schema, Types } from "mongoose";

export const TEACHER_TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TEACHER_TASK_STATUSES = ["open", "completed"] as const;

export type TeacherTaskPriority =
  (typeof TEACHER_TASK_PRIORITIES)[number];
export type TeacherTaskStatus = (typeof TEACHER_TASK_STATUSES)[number];

export interface TeacherTaskDoc {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  title: string;
  notes: string;
  priority: TeacherTaskPriority;
  status: TeacherTaskStatus;
  completedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherTaskSchema = new Schema<TeacherTaskDoc>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    priority: {
      type: String,
      enum: TEACHER_TASK_PRIORITIES,
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: TEACHER_TASK_STATUSES,
      default: "open",
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

TeacherTaskSchema.index({
  teacherId: 1,
  status: 1,
  deletedAt: 1,
  createdAt: -1,
});
TeacherTaskSchema.index({ teacherId: 1, completedAt: -1 });
TeacherTaskSchema.index({ teacherId: 1, priority: 1, status: 1 });

export const TeacherTask =
  (mongoose.models.TeacherTask as Model<TeacherTaskDoc> | undefined) ??
  mongoose.model<TeacherTaskDoc>("TeacherTask", TeacherTaskSchema);
