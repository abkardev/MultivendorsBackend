export const isOwner = (resourceUserId, currentUserId) => {
  const rid = resourceUserId?._id || resourceUserId;
  const cid = currentUserId?._id || currentUserId;
  return rid?.toString() === cid?.toString();
};

export const isAdmin = (user) => {
  return user?.role === 'admin';
};

export const canAccess = (user, resourceUserId) => {
  if (isAdmin(user)) return true;
  return isOwner(resourceUserId, user._id);
};
