import { Schema, model, Types } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

export enum Roles {
  Coach = "coach",
  Client = "client",
  Admin = "admin",
}

export interface IUser {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  password?: string;
  avatar?: string;
  role?: Roles;
  gender?: string;
  languages?: string[];
  birthDate?: string;
  about?: string;
  chats?: Types.ObjectId[];
  gotNewMessagesInChatIDs?: Types.ObjectId[];
}

const baseUserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 30,
    },
    avatar: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
      // unique: true,
      validate: {
        validator: (v: string) => validator.isEmail(v),
        message: "It's not a valid e-mail address",
      },
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => Object.values(Roles).includes(v as Roles),
        message: "Error in role",
      },
    },
    gender: {
      type: String,
    },
    languages: [
      {
        type: String,
      },
    ],
    birthDate: {
      type: String,
    },
    about: {
      type: String,
    },
    chats: [
      {
        type: Types.ObjectId,
        required: true,
        ref: "chat",
      },
    ],
    gotNewMessagesInChatIDs: [
      {
        type: Types.ObjectId,
        ref: "chat",
        required: true,
      },
    ],
  },
  { discriminatorKey: "role", collection: "users" }
);

baseUserSchema.index({ email: 1, role: 1 }, { unique: true });


export const UserModel = model<IUser>("user", baseUserSchema);

export const findUserByCredentials = async ({
  email,
  role,
  password,
}: {
  email: string;
  role: Roles;
  password: string;
}): Promise<Types.ObjectId> => {
  try {
    if (email === "" || password === "") {
      throw new Error("Invalid data");
    }
    const user: IUser | null = await UserModel.findOne({ email, role }).select(
      "+password"
    );
    if (user?.password === undefined || user?.password === null) {
      throw new Error("Incorrect username or password");
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (passwordOk) {
      // console.log(`User found: ${user}`);
      return user._id;
    } else {
      throw new Error("Incorrect username or password");
    }
  } catch (err) {
    console.log(err);
    return await Promise.reject(err);
  }
};
