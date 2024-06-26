import { Router } from "express";
import {
  addMessage,
  checkChat,
  createChat,
  getChatByID,
  refreshChat,
  deleteChat,
} from "../controllers/chats";
import { validateIds } from "../middleware/validation";

export const chatsRouter = Router();

chatsRouter.get("/:chatId", validateIds, getChatByID);
chatsRouter.patch("/check/:chatId", validateIds, checkChat);
chatsRouter.delete("/:chatId", validateIds, deleteChat);
chatsRouter.get("/create/:userId", validateIds, createChat);
chatsRouter.get("/refresh/:chatId/:lastMessageId", validateIds, refreshChat);
chatsRouter.post("/addMessage", addMessage);
