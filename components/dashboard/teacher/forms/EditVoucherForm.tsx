"use client";

import {
  DBClassType,
  DBPlanBillingType,
  DBPlanStatus,
} from "@/lib/types/student";
import { FormattedPlan } from "../students/ActiveVouchersPanel";

interface EditVoucherFormProps {
  student: string;
  plan: FormattedPlan;
  onSubmitForm: (data: EditVoucherFormData) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export interface EditVoucherFormData {
  name: string;
  billingType: DBPlanBillingType | "";
  classType: DBClassType | "";
  creditsTotal: number;
  creditsRemaining: number;
  validFrom: string;
  validUntil: string;
  status: DBPlanStatus;
  price: number;
}

export default function EditVoucherForm({
  student,
  plan,
  onSubmitForm,
  isSubmitting,
  onClose,
}: EditVoucherFormProps) {
  return <div>EditVoucherForm</div>;
}
