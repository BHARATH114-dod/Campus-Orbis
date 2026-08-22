let currentToken = null;

export function setCurrentPushToken(token) {
  currentToken = token;
}

export function getCurrentPushToken() {
  return currentToken;
}
