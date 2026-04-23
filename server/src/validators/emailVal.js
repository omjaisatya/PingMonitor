const emailVal = (email) => {
  const result = email.match(/^[\w\-\.]+@([\w-]+\.)+[\w-]{2,}$/);
  return result;
};

export default emailVal;
// use this in later, in user profile
