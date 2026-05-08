import type { ReactNode } from "react";

type FeatureSplitProps = {
  title: string;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
};

export function FeatureSplit({ title, body, visual, reverse }: FeatureSplitProps) {
  return (
    <section className="section section--white">
      <div className={["container", "split", reverse ? "split--reverse" : ""].filter(Boolean).join(" ")}>
        <div className="copy">
          <h2 className="h2">{title}</h2>
          <p className="p" style={{ whiteSpace: "pre-line" }}>
            {body}
          </p>
        </div>
        <div className="visual" aria-hidden="true">
          {visual}
        </div>
      </div>
    </section>
  );
}

