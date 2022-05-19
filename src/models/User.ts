import mongoose from "mongoose";
import { IUser } from "../types";

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true},
  image: { type: String, default: "/static/user.png" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  commentedOn: { type: [String], default: [] }
});

export default mongoose.model<IUser>("User", UserSchema);