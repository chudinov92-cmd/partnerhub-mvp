import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

type ButtonLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    size?: "md" | "lg";
    noiseImageUrl: string;
  }
>;

export function ButtonLink({
  size = "md",
  noiseImageUrl,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      {...rest}
      className={["btn", size === "lg" ? "btn--lg" : "", className].filter(Boolean).join(" ")}
      style={{ ["--btn-noise" as never]: `url(${noiseImageUrl})` }}
    >
      <span className="btn__bg" aria-hidden="true" />
      <span className="btn__label">{children}</span>
    </a>
  );
}

