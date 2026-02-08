import React from "react";

export interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export default function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = React.useState(src);

  return (
    <img
      {...props}
      src={imgSrc || fallbackSrc || ""}
      alt={alt}
      onError={() => {
        if (fallbackSrc) setImgSrc(fallbackSrc);
      }}
    />
  );
}
