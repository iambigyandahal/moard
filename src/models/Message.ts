import mongoose from "mongoose";
import { IComment, IMessage } from "../types";

const CommentSchema = new mongoose.Schema<IComment>({
  text: { type: String, required: true },
  author: {
    _id: { type: String, required: true },
    username: { type: String, required: true },
    image: { type: String, default: "/static/user.png" }
  },
  date: { type: Date, required: true }
});

const LikeSchema = {
  status: { type: Number, required: true },
  messageId: { type: String, require: true }
};

const MessageSchema = new mongoose.Schema<IMessage>({
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  description: { type: String, required: true },
  likes: { type: [LikeSchema], default: [] },
  date: { type: Date, required: true },
  categories: { type: [String], default: []},
  author: {
    _id: { type: String, required: true },
    username: { type: String, required: true },
    image: { type: String, default: "/static/user.png" }
  },
  comments: { type: [CommentSchema], default: [] }
});

export default mongoose.model<IMessage>("Message", MessageSchema);