import session from "express-session";
import mongoose from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  image: string;
  username: string;
  email: string;
  password: string;
  commentedOn: string[];
}

export interface IComment {
  _id: string;
  text: string;
  author: {
    _id: string;
    username: string;
    image: string;
  };
  date: Date;
}

export interface ILike {
  status: number;
  messageId: string;
};

export interface IMessage {
  _id: string;
  title: string;
  description: string;
  likes: ILike[];
  categories: ILike[];
  excerpt: string;
  date: Date;
  author: {
    _id: string;
    username: string;
    image: string;
  };
  comments: IComment[];
}

export interface UserInterface {
  _id: string;
  name: string;
  image: string;
  username: string;
  email: string;
  password?: string;
  commentedOn?: string[];
}

declare module "express" {
  export interface Request {
    user?: UserInterface
  }
}

declare module "express-session" {
  export interface SessionData {
    userId?: string
  }
}