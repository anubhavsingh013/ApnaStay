import { Link } from "react-router-dom";
import logoSrc from "@/assets/apnastay-logo.png";

/** Slogan used across the app for consistency */
export const APNASTAY_SLOGAN = "Your Home, Your Way";

type LogoVariant = "light" | "dark";

const ApnaStayLogo = ({
  className = "",
  size = "default",
  variant = "light",
  showSlogan = true,
  asLink = true,
  layout = "horizontal",
}: {
  className?: string;
  size?: "default" | "large";
  /** light = for dark backgrounds (e.g. navbar), dark = for light backgrounds (e.g. auth pages) */
  variant?: LogoVariant;
  showSlogan?: boolean;
  asLink?: boolean;
  layout?: "horizontal" | "stacked";
}) => {
  const isLarge = size === "large";
  const isDarkVariant = variant === "dark";

  const iconSize = isLarge ? 56 : 44;
  const textSize = isLarge ? "text-2xl" : "text-xl";
  const sloganSize = isLarge ? "text-[11px]" : "text-[10px]";

  const brandColor = isDarkVariant ? "text-black" : "text-white";
  const sloganColor = isDarkVariant ? "text-stone-600" : "text-slate-400";

  const content = (
    <div
      className={`flex items-center gap-3 group ${className} ${
        layout === "stacked" ? "flex-col text-center" : ""
      }`}
    >
      <img
        src={logoSrc}
        alt="ApnaStay"
        width={iconSize}
        height={iconSize}
        className="shrink-0 object-contain"
      />
      <div
        className={`flex flex-col leading-tight justify-center ${
          layout === "stacked" ? "items-center" : ""
        }`}
      >
        <span
          className={`font-extrabold tracking-tight uppercase ${textSize} ${brandColor}`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          ApnaStay
        </span>
        {showSlogan && (
          <span
            className={`font-medium tracking-[0.2em] uppercase mt-0.5 ${sloganSize} ${sloganColor}`}
          >
            {APNASTAY_SLOGAN}
          </span>
        )}
      </div>
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default ApnaStayLogo;
