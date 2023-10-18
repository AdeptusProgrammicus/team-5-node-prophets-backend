import { RequestHandler } from "express";
import { User } from "../models/user";
import { Qak } from "../models/qak";
import {
  hashPassword,
  comparePasswords,
  signUserToken,
  verifyUser,
} from "../services/auth";

export const getAllUsers: RequestHandler = async (req, res, next) => {
  let users = await User.findAll();
  res.status(200).json(users);
};

export const createUser: RequestHandler = async (req, res, next) => {
  let newUser: User = req.body;
  if (newUser.username && newUser.password) {
    let hashedPassword = await hashPassword(newUser.password);
    newUser.password = hashedPassword;
    let created = await User.create(newUser);
    res.status(201).json({
      user_id: created.user_id,
      fullname: created.fullname,
      username: created.username,
      email: created.email,
      city: created.city,
    });
  } else {
    res.status(400).send("Please complete all required fields");
  }
};

export const loginUser: RequestHandler = async (req, res, next) => {
  let existingUser: User | null = await User.findOne({
    where: { username: req.body.username },
  });

  if (existingUser) {
    let passwordsMatch = await comparePasswords(
      req.body.password,
      existingUser.password
    );

    if (passwordsMatch) {
      let token = await signUserToken(existingUser);
      res.status(200).json({ token });
    } else {
      res.status(401).json("Invalid password");
    }
  } else {
    res.status(401).json("Invalid username");
  }
};

export const getUserProfile: RequestHandler = async (req, res, next) => {
  let user: User | null = await verifyUser(req);

  let reqId = parseInt(req.params.id);

  if (user && user.user_id === reqId) {
    let { fullname, password, email, city, state, profilePicture } = user;
    res.status(200).json({
      fullname,
      password,
      email,
      city,
      state,
      profilePicture,
    });
  } else {
    res.status(401).send();
  }
};

export const getUserQaks: RequestHandler = async (req, res, next) => {
  let user: User | null = await verifyUser(req);

  if (user) {
    let posts = await User.findByPk(user.user_id, {
      include: Qak,
    });
    res.status(200).json(posts);
  } else {
    res.status(404).json();
  }
};

export const updateUserProfile: RequestHandler = async (req, res, next) => {
  const user: User | null = await verifyUser(req);

  if (!user) {
    return res.status(401).send("Unauthorized");
  }

  const reqId = parseInt(req.params.id);

  if (user.user_id !== reqId) {
    return res
      .status(403)
      .send("Forbidden: You can only update your own profile.");
  }

  // Assuming you have the updated profile data in the request body
  const updatedProfileData = req.body;

  // Update the user's profile data
  try {
    await User.update(updatedProfileData, {
      where: { user_id: reqId },
    });

    // Fetch the updated user data to send back in the response
    const updatedUser = await User.findByPk(reqId);

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
};
