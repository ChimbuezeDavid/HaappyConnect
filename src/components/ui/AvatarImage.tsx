import React, { useState, useEffect } from "react";
import { Image, ImageProps } from "react-native";
import { getAvatarUrl } from "@/lib/avatar";

interface AvatarImageProps extends Omit<ImageProps, "source"> {
  avatarUrl?: string | null;
  fullName?: string | null;
  className?: string;
}

export default function AvatarImage({ avatarUrl, fullName, className, style, ...props }: AvatarImageProps) {
  const initialUrl = getAvatarUrl(avatarUrl, fullName);
  const [currentUri, setCurrentUri] = useState(initialUrl);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=059669&color=ffffff&size=256&bold=true&format=png`;

  useEffect(() => {
    setCurrentUri(getAvatarUrl(avatarUrl, fullName));
  }, [avatarUrl, fullName]);

  return (
    <Image
      {...props}
      source={{ uri: currentUri }}
      className={className}
      style={style}
      onError={() => {
        if (currentUri !== fallbackUrl) {
          setCurrentUri(fallbackUrl);
        }
      }}
    />
  );
}

