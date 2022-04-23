import { NextFunction, Request, Response } from "express";
import { MongoError } from "mongodb";
import User from "../models/User";
import { IUser, UserInterface } from "../types";

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
  if(!(req.session && req.session.userId)) return next();

  User.findById(req.session.userId, (err: MongoError , user: UserInterface) => {
		if(err) {
			return next(err);
		}

    if(!user) return next();

    delete user.password;

    req.user = user;
    res.locals.user = user;

    next();
  });
};

export const checkLogin = (req: Request, res: Response, next: NextFunction) => {
  if(!req.user) return res.redirect("/login");

  next();
};

export const isLoggedIn = (req: Request) => {
  if(!req.user) return false;
  return true;
};