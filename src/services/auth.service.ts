import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import bcrypt from "bcryptjs";
import { generateTokens } from "../utils/jwt";

const userRepo = () => AppDataSource.getRepository(User);

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const existing = await userRepo().findOne({ where: { email } });
  if (existing) throw new Error("EMAIL_EXISTS");

  const hashed = await bcrypt.hash(password, 12);

  const user = userRepo().create({ name, email, password: hashed });
  await userRepo().save(user);

  const tokens = generateTokens(user.id, user.email, user.name);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    ...tokens,
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await userRepo()
    .createQueryBuilder("user")
    .addSelect("user.password")
    .where("user.email = :email", { email })
    .getOne();

  if (!user) throw new Error("INVALID_CREDENTIALS");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

  const tokens = generateTokens(user.id, user.email, user.name);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    ...tokens,
  };
};

export const refreshUserToken = async (refreshToken: string) => {
  const jwt = await import("jsonwebtoken");
  const decoded = jwt.default.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET as string,
  ) as { id: string };

  const user = await userRepo().findOne({ where: { id: decoded.id } });
  if (!user) throw new Error("USER_NOT_FOUND");

  return generateTokens(user.id, user.email, user.name);
};
