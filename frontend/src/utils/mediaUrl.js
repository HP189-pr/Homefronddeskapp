import { API_BASE_URL } from "../api/axiosInstance";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

export const normalizeMediaUrl = (value) => {
  if (!value) return value;

  if (isAbsoluteUrl(value) || value.startsWith("data:")) {
    try {
      const url = new URL(value);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${API_BASE_URL}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  if (value.startsWith("/media/")) {
    return `${API_BASE_URL}${value}`;
  }

  if (value.startsWith("/api/profile/photo/")) {
    return `${API_BASE_URL}${value}`;
  }

  if (value.startsWith("media/")) {
    return `${API_BASE_URL}/${value}`;
  }

  if (value.startsWith("profile_pictures/")) {
    return null;
  }

  return value;
};

export const DEFAULT_PROFILE_PIC = "/profilepic/default-profile.png";

export const resolveProfilePictureOrNull = (source) => {
  const raw =
    source?.profile_picture_url ||
    source?.photoUrl ||
    source?.profile_picture ||
    source?.usrpic ||
    source?.avatar ||
    source?.avatar_url ||
    source?.user_profile?.profile_picture ||
    source?.profile?.profile_picture ||
    source?.profilePicture ||
    "";

  const normalized = normalizeMediaUrl(raw);
  if (!normalized) return null;

  const value = String(normalized).trim();
  if (!value) return null;

  // Prevent broken relative filename paths like "hpadmin.jpg"; require full/known media paths
  const looksLikeBareFile = !value.includes('/') && /\.(png|jpg|jpeg|webp|gif)$/i.test(value);
  if (looksLikeBareFile) return null;

  return value;
};

export const resolveProfilePicture = (source) => {
  return resolveProfilePictureOrNull(source) || DEFAULT_PROFILE_PIC;
};
