import { Schema } from "mongoose";
import type { IUser } from "./baseUser";
import { UserModel } from "./baseUser";

export interface IAdmin extends IUser {}

const adminSchema = new Schema<IAdmin>({});

export const AdminModel = UserModel.discriminator<IAdmin>("admin", adminSchema);
