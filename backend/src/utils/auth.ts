import jwt from "jsonwebtoken";
import env from "./env";

export namespace Auth {
  export namespace Jwt {
    export const createTokensFor = async (address: string) => {
      const access_token = jwt.sign({ sub: address }, env.JWT_AT_SECRET_KEY, {
        expiresIn: env.JWT_AT_EXP_IN,
      });

      const refresh_token = jwt.sign({ sub: address }, env.JWT_RT_SECRET_KEY, {
        expiresIn: env.JWT_RT_EXP_IN,
      });

      return { access_token, refresh_token };
    };

    export const decodeAndVerify = async (
      tokenType: "access" | "refresh",
      token: string
    ) => {
      let jwtSecretKey =
        tokenType === "access" ? env.JWT_AT_SECRET_KEY : env.JWT_RT_SECRET_KEY;

      return jwt.verify(token, jwtSecretKey).sub;
    };
  }
}
