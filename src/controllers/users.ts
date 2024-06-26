import type { Response, Request, NextFunction } from "express";
import { UserModel, findUserByCredentials } from "../models/baseUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ClientModel } from "../models/client";
import type { IClient } from "../models/client";
import type { ICoach } from "../models/coach";
import type { IAdmin } from "../models/admin";
import { unlink } from "fs/promises";
import { CoachModel } from "../models/coach";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/errors/errorClasses";
import type {
  ReqChangePassword,
  ReqWithUserAndFileInfo,
  ReqWithUserInfo,
} from "../appTypes";
import { AdminModel } from "../models/admin";
import { JWT_SECRET } from "../utils/config";
import path from "path";
import { userpicsPath } from "../app";

export const chatsPopulatedInfo = {
  path: "chats",
  select: "_id",
  populate: [
    {
      path: "members",
      select: "_id name role",
    },
    {
      path: "lastMessage",
      select: "timestamp",
    },
  ],
};

const userPrivateInfoToSend = (user: any): any => {
  // const { __v, password, ...privateInfoToSend } = user._doc;
  const { password, ...privateInfoToSend } = user;
  // console.log(privateInfoToSend);
  return privateInfoToSend;
};

const userPublicInfoToSend = (user: any): any => {
  // const { __v, password, email, role, status, ...publicInfoToSend } = user._doc;
  const { password, email, role, status, ...publicInfoToSend } = user;
  return publicInfoToSend;
};

export const getCurrentUser = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserInfo;

  console.log("Get user by token", req.user._id, req.user.role);
  try {
    const user = await UserModel.findById(req.user._id)
      .populate(chatsPopulatedInfo)
      .orFail()
      .lean()
      .exec();

    //  here we filter non-existing chats (may be they were deleted for some reason from outside)
    //  so we perform this cleanup here
    //  actualy, when populating non-existing chats are not added to the array
    //  though, some documentation has info, that they can pe populated as null
    //  so we'd better check it
    user.chats = user.chats?.filter((chat, idx) => {
      // console.log(`Idx: ${idx}, chat: ${chat}`);
      return chat !== null;
    });
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { chats: user.chats } }
    );

    res.send(userPrivateInfoToSend(user));
    console.log(`User ${user.name} found`);
    // console.dir(user.chats);
  } catch (err: any) {
    console.error(err.name);
    if (err.name === "CastError") {
      next(
        new BadRequestError(`The id: '${req.user._id.toString()}' is invalid`)
      );
      return;
    }
    if (err.name === "DocumentNotFoundError") {
      next(
        new NotFoundError(`There's no user with id: ${req.user._id.toString()}`)
      );
      return;
    }
    next(err);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("User creation request:");
  console.dir(req.body);
  try {
    const passwordHash = await bcrypt.hash(req.body.password as string, 10);

    const user = await UserModel.create({
      ...req.body,
      password: passwordHash,
    });

    res.send(userPrivateInfoToSend(user));
    console.log(`User created: ${user.name}`);
  } catch (err: any) {
    console.error(err.name, "|", err.message);
    if (err.name === "ValidationError") {
      next(new BadRequestError("Invalid data"));
      return;
    }
    if (err.name === "MongoServerError" || err.code === 11000) {
      next(new ConflictError("User already exists"));
      return;
    }
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log("Login");

  try {
    const userId = await findUserByCredentials({
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
    });

    let user;

    switch (req.body.role) {
      case "client":
        user = await ClientModel.findById(userId)
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
      case "coach":
        user = await CoachModel.findById(userId)
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
      case "admin":
        user = await AdminModel.findById(userId)
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
    }

    console.log("Successful user login:", user?.name);
    const token = jwt.sign({ _id: user?._id, role: user?.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.send({
      token,
      ...userPrivateInfoToSend(user),
    });
  } catch (err: any) {
    console.error("Error:", err.message);
    if (err.message === "Incorrect username or password") {
      next(new UnauthorizedError(err.message as string));
      return;
    }
    if (err.message === "Invalid data") {
      next(new BadRequestError(err.message as string));
      return;
    }
    next(err);
  }
};

export const setUserpic = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserAndFileInfo;

  const avatar = req.file.filename;
  try {
    const oldUserInfo = await UserModel.findById(req.user._id)
      .select("avatar")
      .orFail()
      .exec();
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true, runValidators: true }
    )
      .orFail()
      .lean()
      .exec();

    res.send(userPrivateInfoToSend(updatedUser));
    console.log(`User ${updatedUser.name} modified`);
    console.log(
      `Old avatar: ${oldUserInfo.avatar}, new avatar: ${updatedUser.avatar}`
    );
    if (oldUserInfo.avatar) {
      const oldAvatarPath = path.join(userpicsPath, oldUserInfo.avatar);
      console.log(oldAvatarPath);
      try {
        await unlink(oldAvatarPath);
      } catch (err: any) {
        console.log("Error deleting old avatar");
      }
    }
  } catch (err: any) {
    console.error(err.name);
    if (err.name === "DocumentNotFoundError") {
      next(
        new NotFoundError(`There's no user with id: ${req.user._id.toString()}`)
      );
      return;
    }
    if (err.name === "ValidationError") {
      next(new BadRequestError("Invalid data"));
      return;
    }
    next(err);
  }
};

export const modifyCurrentUserData = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserAndFileInfo;

  const {
    _id,
    __v,
    role,
    avatar,
    chats,
    gotNewMessagesInChatIDs,
    ...updatedInfo
  } = req.body;
  const clientUpdatedInfo = updatedInfo as IClient;
  const coachUpdatedInfo = updatedInfo as ICoach;
  const adminUpdatedInfo = updatedInfo as IAdmin;
  // console.dir(updatedInfo);

  let user;

  try {
    switch (req.user.role) {
      case "client":
        user = await ClientModel.findByIdAndUpdate(
          req.user._id,
          clientUpdatedInfo,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
      case "coach":
        user = await CoachModel.findByIdAndUpdate(
          req.user._id,
          coachUpdatedInfo,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
      case "admin":
        user = await AdminModel.findByIdAndUpdate(
          req.user._id,
          adminUpdatedInfo,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(chatsPopulatedInfo)
          .orFail()
          .lean()
          .exec();
        break;
    }

    // console.dir(user);
    res.send(userPrivateInfoToSend(user));
    console.log(`User ${user?.name} modified`);
  } catch (err: any) {
    console.error(err.name, "|", err.message);

    if (err.name === "MongoServerError" || err.code === 11000) {
      next(new ConflictError("User already exists"));
      return;
    }

    if (err.name === "DocumentNotFoundError") {
      next(
        new NotFoundError(`There's no user with id: ${req.user._id.toString()}`)
      );
      return;
    }

    if (err.name === "ValidationError") {
      next(new BadRequestError("Invalid data"));
      return;
    }

    next(err);
  }
};

export const updateUserPassword = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqChangePassword;

  const { oldPassword, password } = req.body;

  // const clientUpdatedInfo = updatedInfo as IClient;
  // const coachUpdatedInfo = updatedInfo as ICoach;
  // const adminUpdatedInfo = updatedInfo as IAdmin;
  // console.dir(updatedInfo);

  let user;

  try {
    const user = await UserModel.findById(req.user._id)
      .orFail()
      .select("+password");

    if (user.password) {
      const passwordOk = await bcrypt.compare(oldPassword, user.password);
      if (!passwordOk) {
        throw new UnauthorizedError("Wrong old password");
      }

      console.log(req.body);

      const hashedPassword = await bcrypt.hash(password, 10);

      user.password = hashedPassword;

      await user.save();

      console.log(
        `Password updated successfully for user with ID: ${req.user._id}`
      );
      res.send({ message: "Password changed" });
    }
  } catch (err: any) {
    console.error(err.name, "|", err.message);

    if (err.name === "MongoServerError" || err.code === 11000) {
      next(new ConflictError("User already exists"));
      return;
    }

    if (err.name === "DocumentNotFoundError") {
      next(
        new NotFoundError(`There's no user with id: ${req.user._id.toString()}`)
      );
      return;
    }

    if (err.name === "ValidationError") {
      next(new BadRequestError("Invalid data"));
      return;
    }

    next(err);
  }
};

export const getAllCoaches = async (
  reqOrigin: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const allCoaches: ICoach[] = await CoachModel.find({}).lean().exec();

    // const coachesFullInfo = foundDoc as Array<{ _doc: ICoach }>;
    console.log("Get all items");
    const coachesToSend = allCoaches
      .filter((coach) => coach.status === "active")
      .map((coach) => userPublicInfoToSend(coach));
    res.send({ data: coachesToSend });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// ------------------ temporary ----------------------------

// export const generateRandomCoach = (
//   reqOrigin: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const req = reqOrigin as ReqWithUserInfo;

//   interface CoachInfo {
//     role: string;
//     name: string;
//     avatar: string;
//     email: string;
//     gender: string;
//     birthDate: string;
//     languages: Array<string>;
//     about: string;
//     skills: Array<string>;
//     sertification: string;
//     sertificationLevel: Array<string>;
//     status: string;
//   }

//   const roles = ["client", "coach", "admin"];
//   const genders = ["male", "female", "undefined"];
//   const langs = ["en", "ru", "germ", "fr"];
//   const skills = [
//     "goalSetting",
//     "personalEffectiveness",
//     "motivation",
//     "timeManagement",
//     "selfConfidence",
//     "productiveCommunication",
//     "stressManagement",
//     "decisionMaking",
//     "relationships",
//     "personalDevelopment",
//   ];
//   const sert = ["inTraining", "lev1", "lev2", "levFollowing"];
//   const sertLev = [
//     "ACC",
//     "PCC",
//     "MCC",
//     "PractRFPC",
//     "ExpertRFPC",
//     "MasterRFPC",
//   ];
//   const status = ["active", "busy"];
//   // Set a minimum age (let's say 18 years old)
//   const minAge = 18;
//   const maxAge = 65; // You can adjust this

//   function generateBirthDate() {
//     const yearsAgo = faker.number.int({ min: minAge, max: maxAge });

//     // Subtract years from the current date
//     const birthDate = new Date();
//     birthDate.setFullYear(birthDate.getFullYear() - yearsAgo);

//     // Format as YYYY-MM-DD (no changes needed here)
//     return birthDate.toISOString().slice(0, 10);
//   }

//   function generateCoachAbout() {
//     const coachingFocus = [
//       "life transformation",
//       "career development",
//       "mindfulness",
//       "relationship building",
//       "goal achievement",
//     ];
//     const adjectives = [
//       "experienced",
//       "dedicated",
//       "compassionate",
//       "results-oriented",
//       "insightful",
//     ];

//     const focus = faker.helpers.arrayElement(coachingFocus);
//     const adjective = faker.helpers.arrayElement(adjectives);

//     const aboutMe = `I'm an ${adjective} coach specializing in ${focus}. I'm committed to helping you unlock your potential and achieve your goals. ${faker.company.buzzPhrase()}`; // Adds a coaching buzzword

//     return aboutMe;
//   }

//   const generateCoach: () => CoachInfo = () => {
//     const addedCoach: CoachInfo = {
//       role: "coach",
//       name: faker.person.fullName(),
//       avatar: "avatar_661cf19ca06caf5fb48b7e34",
//       email: faker.internet.email(),
//       gender: faker.helpers.arrayElement(genders),
//       birthDate: generateBirthDate(),
//       languages: faker.helpers.arrayElements(langs),
//       about: generateCoachAbout(),
//       skills: faker.helpers.arrayElements(skills),
//       sertification: faker.helpers.arrayElement(sert),
//       sertificationLevel: faker.helpers.arrayElements(sertLev),
//       status: faker.helpers.arrayElement(status),
//     };
//     return addedCoach;
//   };

//   const addCoachToDB = async () => {
//     const hash = await bcrypt.hash("easyone", 10);
//     const createdUser = await CoachModel.create({
//       ...generateCoach(),
//       password: hash,
//     });
//     res.send(createdUser);
//   };
//   console.log("Generating random coach");
//   addCoachToDB();
// };
