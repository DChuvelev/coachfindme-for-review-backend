import { Schema } from "mongoose";
import { UserModel } from "./baseUser";
import type { IUser } from "./baseUser";

export interface ICoach extends IUser {
  status: string;
  skills: string[];
  paymentOptions: string[];
  paymentScheme: string;
  sertification: string;
  sertificationLevel: string[];
}

const coachSchema = new Schema<ICoach>({
  skills: [
    {
      type: String,
    },
  ],
  paymentOptions: [
    {
      type: String,
    },
  ],
  paymentScheme: {
    type: String,
  },
  sertification: {
    type: String,
    default: "inTraining",
  },
  sertificationLevel: [
    {
      type: String,
    },
  ],
  status: {
    type: String,
    default: "active",
  },
});

export const CoachModel = UserModel.discriminator<ICoach>("coach", coachSchema);
