import type { Response, Request, NextFunction } from "express";
import { ChatModel, MessageModel } from "../models/chats";
import type { IChat, IMessage } from "../models/chats";
import type { ReqWithUserInfo } from "../appTypes";
import type { IUser } from "../models/baseUser";
import { UserModel } from "../models/baseUser";
import mongoose, { Types } from "mongoose";
import { socketUsersRecord } from "../utils/websocket/websocket";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../utils/errors/errorClasses";

export const getChatByID = (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): void => {
  const req = reqOrig as ReqWithUserInfo;
  console.log(req.params.chatId);
};

export const checkChat = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserInfo;
  try {
    const chat = await ChatModel.exists({ _id: req.params.chatId });
    if (chat === null) {
      //  that means that the chat does not exist for some reason and we have to reconstruct it
      const memberIds: Types.ObjectId[] = req.body.members;
      const members: IUser[] = [];
      for (const memberId of memberIds) {
        const member = await UserModel.findById(memberId).orFail();
        members.push(member?._id);
      }
      await ChatModel.create({
        _id: req.params.chatId,
        messages: [],
        members,
      });
    }
    res.sendStatus(200);
  } catch (err: any) {
    console.log(err);
    if (err.name === "DocumentNotFoundError") {
      next(new NotFoundError(`There's no chat with id: ${req.params.chatId}`));
      return;
    }
    if (err.name === "CastError") {
      next(new BadRequestError(`Id '${req.params.chatId}' is invalid`));
      return;
    }
    if (err.name === "Error" && err.message === "Forbidden") {
      next(new ForbiddenError("Unauthorized"));
      return;
    }
    next(new InternalServerError("Server error"));
  }
};

export const createChat = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserInfo;
  console.log(req.params.chatId);
  try {
    const firstMember = await UserModel.findById(req.user._id).orFail();
    const secondMember = await UserModel.findById(req.params.userId).orFail();
    const newChat: IChat = {
      _id: new Types.ObjectId(),
      messages: [],
      members: [
        {
          _id: firstMember._id,
          role: firstMember.role,
          name: firstMember.name,
        },
        {
          _id: secondMember?._id,
          role: secondMember?.role,
          name: secondMember.name,
        },
      ],
    };
    // to the ChatModel we save a chat with both members
    // to the User model we save chat with just chat partner as a member of a chat.
    const newCreatedChat: IChat = await ChatModel.create(newChat);
    firstMember.chats?.push(newCreatedChat._id);

    await firstMember.save();
    secondMember.chats?.push(newCreatedChat._id);
    await secondMember.save();
    console.log(`Chat with id:${newCreatedChat._id.toString()} created`);
    res.send(newCreatedChat._id);
  } catch (err: any) {
    console.log(err);
    if (err.name === "DocumentNotFoundError") {
      next(new NotFoundError(`Couldn't find document`));
      return;
    }
    next(new InternalServerError("Server error"));
  }
};

export const refreshChat = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserInfo;

  let chatId;
  try {
    chatId = new mongoose.Types.ObjectId(req.params.chatId);
  } catch {
    chatId = undefined;
  }

  let lastMessageId;
  try {
    lastMessageId = new mongoose.Types.ObjectId(req.params.lastMessageId);
  } catch {
    lastMessageId = undefined;
  }
  // console.log(chatId, lastMessageId);

  try {
    const chat = await ChatModel.findById(chatId)
      .populate(
        // path: "chats",
        // select: "_id",
        [
          {
            path: "members",
            select: "_id name role",
          },
          {
            path: "messages",
          },
        ]
      )
      .orFail();

    // console.log("Before sorting", chat?.messages);
    // console.log(chat);

    if (lastMessageId !== undefined) {
      const startIndex = chat.messages.findIndex((message: IMessage) =>
        lastMessageId.equals(message._id as unknown as string)
      ); // Finding the index of the lastMessage if provided

      if (startIndex !== -1) {
        chat.messages = chat.messages.slice(startIndex + 1);
      } //  Sorting only the messages that appeared after the lastMessage
    }
    // console.log("After sorting", chat?.messages);

    //  Now we need to remove this chat from the list of the chats with new messages
    //  for the current user, as the chat is refreshed and all messages should be received.
    const currentUser = await UserModel.findById(req.user._id).orFail();
    // console.log(currentUser?.gotNewMessagesInChatIDs);
    let thisChatIndexInNewMessages;
    if (chatId !== undefined)
      thisChatIndexInNewMessages =
        currentUser?.gotNewMessagesInChatIDs?.findIndex((checkedId) =>
          chatId.equals(checkedId as unknown as string)
        );
    // console.log(thisChatIndexInNewMessages);
    if (
      thisChatIndexInNewMessages !== undefined &&
      thisChatIndexInNewMessages !== -1
    ) {
      // console.log("Removing!");
      currentUser?.gotNewMessagesInChatIDs?.splice(
        thisChatIndexInNewMessages,
        1
      );
    }
    // console.log(currentUser?.gotNewMessagesInChatIDs);
    await currentUser?.save();

    res.send(chat);
  } catch (err: any) {
    console.error("Error refreshing chat:", err);
    if (err.name === "DocumentNotFoundError") {
      next(
        new NotFoundError(`There's no document with id: ${req.params.chatId}`)
      );
      return;
    }
    if (err.name === "CastError") {
      next(new BadRequestError(`Id '${req.params.chatId}' is invalid`));
      return;
    }
    next(new InternalServerError("Server error"));
  }
};

export const addMessage = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const req = reqOrig as ReqWithUserInfo;
    const {
      chatId,
      authorId,
      text,
    }: {
      chatId: Types.ObjectId;
      authorId: Types.ObjectId;
      text: string;
    } = req.body;

    const newCreatedMessage = await MessageModel.create({
      _id: new Types.ObjectId(),
      text,
      timestamp: new Date().toISOString(),
      authorId,
      edited: false,
      fromChatId: chatId,
    });

    // console.log(newMessage);

    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: chatId },
      {
        $push: { messages: newCreatedMessage._id },
        $set: { lastMessage: newCreatedMessage._id },
      },
      { new: true }
    ).orFail();

    // Now we look for the chat members to update their new message info
    const memberPromises = updatedChat.members.map((member) => {
      return UserModel.findById(member._id)
        .populate({
          //  we should populate lastMessage for sorting purposes
          path: "chats",
          select: "lastMessage",
        })
        .orFail();
    });

    const memberArray = await Promise.all(memberPromises);

    // and adding this chat to their list of chats with new messages.

    memberArray.forEach((member) => {
      if (
        member?.gotNewMessagesInChatIDs?.findIndex((checkedId) =>
          checkedId.equals(updatedChat._id as unknown as string)
        ) === -1
      ) {
        //  we need to check if the chat is not already there to avoid duplication
        member?.gotNewMessagesInChatIDs.push(updatedChat._id);
      }

      //  we also need to sort each user chats list by the timestamp of the last message
      if (member.chats !== undefined && member.chats.length > 1) {
        member.chats?.sort((a, b) => {
          const chatALastMessageDate = (
            a as unknown as IChat
          ).lastMessage?.getTimestamp();
          const chatBLastMessageDate = (
            b as unknown as IChat
          ).lastMessage?.getTimestamp();
          if (
            chatALastMessageDate === undefined ||
            chatBLastMessageDate === undefined
          )
            return 0;
          if (chatALastMessageDate === chatBLastMessageDate) return 0;
          return chatALastMessageDate > chatBLastMessageDate ? -1 : 1;
        });
      }
    });

    await Promise.all(memberArray.map(async (member) => await member?.save()));

    //  and the last step is to inform them all through websockets that they got a new message
    //  we don't send message itself, we just need to send the chatId and timestamp for sorting purposes
    memberArray.forEach((member) => {
      for (const token in socketUsersRecord) {
        if (
          member?._id.equals(
            socketUsersRecord[token].userId as unknown as string
          )
        ) {
          console.log(
            `Sending isocket message to user ${member._id.toString()}`
          );
          socketUsersRecord[token].socket.emit("new_message_in_chat", {
            chatId,
            messageId: newCreatedMessage._id,
            timestamp: newCreatedMessage.timestamp,
          });
        }
      }
    });

    res.send(newCreatedMessage._id);
  } catch (err: any) {
    console.error("Error adding message:", err);
    if (err.name === "DocumentNotFoundError") {
      next(new NotFoundError(`Couldn't find document`));
      return;
    }
    next(new InternalServerError("Server error"));
  }
};

export const deleteChat = async (
  reqOrig: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const req = reqOrig as ReqWithUserInfo;
  try {
    const chatId = req.params.chatId as unknown as Types.ObjectId;
    console.log(`Deleteing chat with id ${chatId.toString()}`);
    const result = await ChatModel.deleteOne({ _id: chatId }).orFail().exec();
    console.log(result);

    console.log(
      `Successfully deleted one document with id ${chatId.toString()}.`
    );

    res.send(result);
  } catch (err: any) {
    console.error(err.name);
    if (err.name === "DocumentNotFoundError") {
      next(new NotFoundError(`There's no chat with id: ${req.params.chatId}`));
      return;
    }
    if (err.name === "CastError") {
      next(new BadRequestError(`Id '${req.params.chatId}' is invalid`));
      return;
    }
    if (err.name === "Error" && err.message === "Forbidden") {
      next(new ForbiddenError("Unauthorized delete"));
      return;
    }
    next(new InternalServerError("Server error"));
  }
};
