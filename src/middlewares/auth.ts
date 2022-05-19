import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { UserInterface } from "../types";

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  if(!(req.session && req.session.userId)) return next();

  try {
    const user: UserInterface = await User.findById(req.session.userId).lean();

    if(!user) return next();

    delete user["password"];
    delete user["commentedOn"];
    
    req.user = user;
    res.locals.user = user;

    next();
  } catch(err) {
    return next(err);
  }
};

export const checkLogin = (req: Request, res: Response, next: NextFunction) => {
  if(!req.user) return res.redirect("/login");

  next();
};

export const isLoggedIn = (req: Request) => {
  if(!req.user) return false;
  return true;
};