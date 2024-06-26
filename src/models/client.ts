import { Schema } from "mongoose";
import { UserModel } from "./baseUser";
import type { IUser } from "./baseUser";

export interface IClient extends IUser {
  coachRequests: string[];
}

const clientSchema = new Schema<IClient>({});

export const ClientModel = UserModel.discriminator<IClient>(
  "client",
  clientSchema
);
