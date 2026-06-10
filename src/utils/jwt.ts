import jwt from "jsonwebtoken";

export const generateTokens = (userId: string, email: string, name: string) => {
  const accessToken = jwt.sign(
    { id: userId, email, name },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};
