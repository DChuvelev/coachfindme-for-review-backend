import type { Request } from "express";
import multer from "multer";
import type { Multer } from "multer";
import { userpicsPath } from "../app";
import { setUserpic } from "../controllers/users";
import { Router } from "express";

export const userpicsRouter = Router();

const storage: multer.StorageEngine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, userpicsPath);
  },
  filename: function (req: Request & { user: { _id: string } }, file, cb) {
    console.log(req.user._id);
    const uniqueSuffix =
      "avatar_" +
      req.user._id +
      "_" +
      Math.random().toString(36).substring(2, 10);
    cb(null, uniqueSuffix);
  },
});

const upload: Multer = multer({
  storage,
});

userpicsRouter.post("", upload.single("avatar"), setUserpic);
