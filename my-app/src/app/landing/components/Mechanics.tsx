"use client";

type MechanicsProps = {
  title: string;
  items: Array<{
    iconSrc: string;
    iconAlt?: string;
    title: string;
    text: string;
  }>;
};

export function Mechanics({ title, items }: MechanicsProps) {
  return (
    <>
      <section className="section section--white section--mechanicsTitle" aria-label={title}>
        <div className="container">
          <h2 className="h2 h2--center h2--green">{title}</h2>
        </div>
      </section>

      <section className="section section--greenbar">
        <div className="container mechanics">
          {items.map((it) => (
            <div key={it.title} className="mechanic">
              <div className="mechanic__title">{it.title}</div>
              <div className="mechanic__icon" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.iconSrc} alt={it.iconAlt ?? ""} />
              </div>
              <div className="mechanic__text">{it.text}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

