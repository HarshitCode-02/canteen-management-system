const DEFAULT_FALLBACK = "Something went wrong while loading this page. Please try again.";
const DEFAULT_NETWORK = "Unable to connect right now. Please try again in a moment.";
const DEFAULT_TIMEOUT = "This request is taking longer than expected. Please try again.";

const TECHNICAL_MESSAGE = /\b(?:Mongo(?:Server)?Error|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|ERR_NETWORK|Network Error|Failed to fetch|Request failed with status code|TypeError|ReferenceError|SyntaxError|ValidationError|CastError|stack trace|Cannot read properties|node_modules|\/Users\/|\/var\/|\/home\/|database connection|internal server error|E11000|duplicate key error)\b|(?:^|\n)\s*at\s+[\w./\\-]+\s*\(|\bCannot\s+(?:GET|POST|PUT|PATCH|DELETE)\s+\S+/i;

function responseMessage(error) {
  const message = error?.response?.data?.message;
  return typeof message === "string" ? message.trim() : "";
}

function isSafeClientMessage(message) {
  return Boolean(message) && !TECHNICAL_MESSAGE.test(message);
}

export function errorMessage(error, messages = {}) {
  const fallback = messages.fallback || DEFAULT_FALLBACK;
  const network = messages.network || DEFAULT_NETWORK;
  const timeout = messages.timeout || DEFAULT_TIMEOUT;
  const status = error?.response?.status;
  const message = responseMessage(error);

  if (status === 401) {
    if (/invalid email or password|incorrect email or password/i.test(message)) {
      return "Incorrect email or password. Please check your details and try again.";
    }
    return "Your session may have expired. Please sign in again.";
  }
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 408 || status === 504) return timeout;
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return fallback;

  if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") return timeout;
  if (error?.code === "ERR_NETWORK" || error?.request || error?.isAxiosError) return network;
  if (!status) return fallback;

  return isSafeClientMessage(message) ? message : fallback;
}

export const errorMessages = {
  assistant: {
    fallback: "The assistant is temporarily unavailable. Please try again.",
    network: "The assistant is temporarily unavailable. Please try again.",
    timeout: "The assistant is taking longer than expected. Please try again.",
  },
  canteens: {
    fallback: "We couldn't load canteens right now. Please try again.",
    network: "We couldn't load canteens right now. Please try again.",
  },
  login: {
    fallback: "Unable to sign in right now. Please try again.",
    timeout: "Login is taking longer than expected. Please try again.",
  },
  mealSuggestions: {
    fallback: "We couldn't load meal suggestions right now. Please try again.",
    network: "We couldn't load meal suggestions right now. Please try again.",
  },
  reviews: {
    fallback: "We couldn't load reviews right now. Please try again.",
    network: "We couldn't load reviews right now. Please try again.",
  },
  search: {
    fallback: "Search is temporarily unavailable. Please try again.",
    network: "Search is temporarily unavailable. Please try again.",
  },
};
