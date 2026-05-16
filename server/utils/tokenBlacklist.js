const blacklist = new Set();

export const blacklistToken = (token) => {
  blacklist.add(token);

  setTimeout(
    () => {
      blacklist.delete(token);
    },
    15 * 60 * 1000,
  );
};

export const isTokenBlacklisted = (token) => blacklist.has(token);
