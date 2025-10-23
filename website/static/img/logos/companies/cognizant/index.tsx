import { useId } from "react";

export const CognizantLogo = ({ className }: { className?: string }) => {
  const uniqueId = useId();
  const pathClip = `${uniqueId}__pathClip`;
  const clipPrimary = `${uniqueId}__clipPrimary`;
  const pathClipSecondary = `${uniqueId}__pathClipSecondary`;
  const clipSecondary = `${uniqueId}__clipSecondary`;

  const pathLower = `${uniqueId}__pathLower`;
  const clipLower = `${uniqueId}__clipLower`;
  const pathLowerLeft = `${uniqueId}__pathLowerLeft`;
  const clipLowerLeft = `${uniqueId}__clipLowerLeft`;
  const gradientLeft = `${uniqueId}__gradientLeft`;
  const pathLowerRight = `${uniqueId}__pathLowerRight`;
  const clipLowerRight = `${uniqueId}__clipLowerRight`;
  const gradientRight = `${uniqueId}__gradientRight`;
  const pathUpperLeft = `${uniqueId}__pathUpperLeft`;
  const clipUpperLeft = `${uniqueId}__clipUpperLeft`;
  const gradientUpperLeft = `${uniqueId}__gradientUpperLeft`;
  const pathUpperRight = `${uniqueId}__pathUpperRight`;
  const clipUpperRight = `${uniqueId}__clipUpperRight`;
  const gradientUpperRight = `${uniqueId}__gradientUpperRight`;

  return (
    <svg
      className={className}
      viewBox="0 0 245.8 44"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <style>{".st2{fill:currentColor}"}</style>
      <defs>
        <path id={pathClip} d="M59.2 2.7h186.7v40.8H59.2z" />
      </defs>
      <clipPath id={clipPrimary}>
        <use xlinkHref={`#${pathClip}`} overflow="visible" />
      </clipPath>
      <g clipPath={`url(#${clipPrimary})`}>
        <defs>
          <path id={pathClipSecondary} d="M59.2 2.7h186.7v40.8H59.2z" />
        </defs>
        <clipPath id={clipSecondary}>
          <use xlinkHref={`#${pathClipSecondary}`} overflow="visible" />
        </clipPath>
        <g clipPath={`url(#${clipSecondary})`}>
          <path
            className="st2"
            d="M158.7 10.7h3.7v22.1h-3.7V10.7zm-13.5-.5c-2.4 0-4.6.8-6.4 2.3v-1.8h-3.7v22.1h3.7V20.3c0-3.6 2.9-6.4 6.4-6.4s6.4 2.9 6.4 6.4v12.5h3.7V20.3c0-5.6-4.5-10.1-10.1-10.1m-17.5.4h3.7v21.3c-.1 6.3-5.2 11.4-11.5 11.5-5 .1-9.6-3.2-11-8h4c1.3 2.7 4 4.4 7 4.3 4.3-.1 7.7-3.6 7.9-7.9V30c-4.7 4.3-12 4.1-16.3-.6-4.3-4.7-4.1-12 .6-16.3 4.4-4.1 11.3-4.1 15.7 0l-.1-2.5zm0 11.1c0-4.3-3.5-7.9-7.8-7.9s-7.9 3.5-7.9 7.8 3.5 7.9 7.9 7.9c4.3 0 7.8-3.5 7.8-7.8m-57-7.9c3 0 5.8 1.8 7.1 4.5h3.9c-1.8-6.1-8.3-9.6-14.4-7.7-6.1 1.8-9.6 8.3-7.7 14.4s8.3 9.6 14.4 7.7c3.7-1.1 6.6-4 7.7-7.7h-3.9c-1.8 3.9-6.5 5.6-10.4 3.8-3.9-1.8-5.6-6.5-3.8-10.4 1.3-2.8 4-4.6 7.1-4.6m35.9 7.9c0 6.4-5.2 11.5-11.5 11.5-6.4 0-11.5-5.2-11.5-11.5s5-11.5 11.4-11.5 11.6 5.1 11.6 11.5m-3.7 0c0-4.3-3.5-7.9-7.8-7.9s-7.9 3.5-7.9 7.8 3.5 7.9 7.8 7.9c4.4 0 7.9-3.5 7.9-7.8m120.5-11.5c-2.4 0-4.6.8-6.4 2.3v-1.8h-3.7v22.1h3.7V20.3c0-3.6 2.9-6.5 6.4-6.5 3.6 0 6.5 2.9 6.5 6.4v12.5h3.7V20.3c-.1-5.6-4.6-10.1-10.2-10.1m-17.5.5h3.7v22.1h-3.7v-2.6c-4.7 4.3-12 4.1-16.3-.6-4.3-4.7-4.1-12 .6-16.3 2.1-2 4.9-3.1 7.8-3.1 2.9 0 5.7 1.1 7.9 3.1v-2.6zm0 11c0-4.3-3.5-7.8-7.9-7.8-4.3 0-7.8 3.5-7.8 7.9 0 4.3 3.5 7.8 7.8 7.8 4.4-.1 7.9-3.6 7.9-7.9m39.9-7.4v-3.7h-5.5v-6h-3.7v20.8c0 4.1 3.3 7.4 7.4 7.4h1.8v-3.7H244c-2 0-3.7-1.7-3.7-3.7V14.3h5.5zM160.5 2.7c-1.4 0-2.4 1.1-2.4 2.4 0 1.4 1.1 2.4 2.4 2.4 1.4 0 2.4-1.1 2.4-2.4.1-1.3-1-2.4-2.4-2.4.1 0 .1 0 0 0m24 8h-18.4v3.7h13.6l-13.6 14.7v3.7h18.4v-3.7h-13.7l13.6-14.7.1-3.7z"
          />
        </g>
      </g>
      <defs>
        <path id={pathLower} d="M0 0h52.1v44H0z" />
      </defs>
      <clipPath id={clipLower}>
        <use xlinkHref={`#${pathLower}`} overflow="visible" />
      </clipPath>
      <g clipPath={`url(#${clipLower})`}>
        <defs>
          <path id={pathLowerLeft} d="m0 22 15.3 22 15.8-9.5L22.2 22z" />
        </defs>
        <clipPath id={clipLowerLeft}>
          <use xlinkHref={`#${pathLowerLeft}`} overflow="visible" />
        </clipPath>
        <g clipPath={`url(#${clipLowerLeft})`}>
          <linearGradient
            id={gradientLeft}
            gradientUnits="userSpaceOnUse"
            x1="-391.039"
            y1="277.815"
            x2="-390.039"
            y2="277.815"
            gradientTransform="matrix(31.1065 0 0 -21.9795 12163.862 6139.21)"
          >
            <stop offset="0" stopColor="#3d54ce" />
            <stop offset="1" stopColor="#35cacf" />
          </linearGradient>
          <path fill="currentColor" d="M0 22h31.1v22H0z" />
        </g>
        <defs>
          <path id={pathLowerRight} d="M15.3 44h21.8l15-22z" />
        </defs>
        <clipPath id={clipLowerRight}>
          <use xlinkHref={`#${pathLowerRight}`} overflow="visible" />
        </clipPath>
        <g clipPath={`url(#${clipLowerRight})`}>
          <linearGradient
            id={gradientRight}
            gradientUnits="userSpaceOnUse"
            x1="-393.062"
            y1="277.815"
            x2="-392.062"
            y2="277.815"
            gradientTransform="matrix(36.8476 0 0 -21.9795 14498.684 6139.21)"
          >
            <stop offset="0" stopColor="#13457d" />
            <stop offset="1" stopColor="#279698" />
          </linearGradient>
          <path fill="currentColor" d="M15.3 22h36.8v22H15.3z" />
        </g>
        <defs>
          <path id={pathUpperLeft} d="M15.3 0 0 22h22.2l8.9-12.5z" />
        </defs>
        <clipPath id={clipUpperLeft}>
          <use xlinkHref={`#${pathUpperLeft}`} overflow="visible" />
        </clipPath>
        <g clipPath={`url(#${clipUpperLeft})`}>
          <linearGradient
            id={gradientUpperLeft}
            gradientUnits="userSpaceOnUse"
            x1="-391.049"
            y1="277.815"
            x2="-390.049"
            y2="277.815"
            gradientTransform="matrix(31.1316 0 0 -21.9796 12173.976 6117.246)"
          >
            <stop offset="0" stopColor="#090086" />
            <stop offset="1" stopColor="#2f96a9" />
          </linearGradient>
          <path fill="currentColor" d="M0 0h31.1v22H0z" />
        </g>
        <defs>
          <path id={pathUpperRight} d="m15.3 0 36.8 22-15-22z" />
        </defs>
        <clipPath id={clipUpperRight}>
          <use xlinkHref={`#${pathUpperRight}`} overflow="visible" />
        </clipPath>
        <g clipPath={`url(#${clipUpperRight})`}>
          <linearGradient
            id={gradientUpperRight}
            gradientUnits="userSpaceOnUse"
            x1="-393.062"
            y1="277.815"
            x2="-392.062"
            y2="277.815"
            gradientTransform="matrix(36.8476 0 0 -21.9796 14498.684 6117.246)"
          >
            <stop offset="0" stopColor="#3b62ca" />
            <stop offset="1" stopColor="#93dfe3" />
          </linearGradient>
          <path fill="currentColor" d="M15.3 0h36.8v22H15.3z" />
        </g>
      </g>
    </svg>
  );
};
