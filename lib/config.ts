import packageJson from "../package.json";



export const BASE_PATH = "/Jinwoong";



export const APP_NAME = "TargetBridge AI";

export const APP_DESCRIPTION =

  "기업 영업 자동화 및 M&A 타깃 관리 플랫폼";



export const APP_URL =

  process.env.APP_URL ?? "http://localhost:3000/Jinwoong";



export const APP_VERSION = packageJson.version;

