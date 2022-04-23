import session from "express-session";

export interface IUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserInterface {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
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