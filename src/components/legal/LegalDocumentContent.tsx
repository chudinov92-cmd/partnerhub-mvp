type LegalDocumentContentProps = {
  title: string;
  paragraphs: string[];
};

function isAllCapsHeading(text: string): boolean {
  if (text.length > 90) return false;
  const letters = text.replace(/[^A-Za-zА-Яа-яЁё]/g, "");
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase();
}

function isSemicolonListItem(text: string): boolean {
  return text.endsWith(";");
}

function isQuotedListItem(text: string): boolean {
  return text.startsWith("«") && text.endsWith("»,");
}

function isDashSubListItem(text: string): boolean {
  return /^на\s/i.test(text);
}

function isNumberedSection(text: string): boolean {
  return /^\d+(\.\d+)?[\).]?\s/.test(text);
}

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function buildBlocks(paragraphs: string[], title: string): Block[] {
  const body = paragraphs.filter((p, i) => !(i === 0 && p === title));
  const blocks: Block[] = [];
  let i = 0;

  while (i < body.length) {
    const text = body[i];

    if (isAllCapsHeading(text)) {
      blocks.push({ type: "heading", text });
      i += 1;
      continue;
    }

    if (
      isSemicolonListItem(text) ||
      isQuotedListItem(text) ||
      (isDashSubListItem(text) && i > 0 && body[i - 1]?.endsWith(":"))
    ) {
      const items: string[] = [];
      while (i < body.length) {
        const item = body[i];
        if (
          isSemicolonListItem(item) ||
          isQuotedListItem(item) ||
          isDashSubListItem(item)
        ) {
          items.push(item);
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (
      text.endsWith(":") &&
      i + 1 < body.length &&
      (isSemicolonListItem(body[i + 1]) ||
        isDashSubListItem(body[i + 1]) ||
        !isNumberedSection(body[i + 1]))
    ) {
      blocks.push({ type: "paragraph", text });
      i += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text });
    i += 1;
  }

  return blocks;
}

export function LegalDocumentContent({
  title,
  paragraphs,
}: LegalDocumentContentProps) {
  const blocks = buildBlocks(paragraphs, title);

  return (
    <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2
              key={`h-${index}`}
              className="pt-2 text-base font-semibold text-slate-900"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={`ul-${index}`}
              className="list-disc space-y-1 pl-5 marker:text-slate-400"
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={`p-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}
