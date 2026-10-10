#!/usr/bin/env python3
"""Извлечь юр. документ из docx в JSON для LegalDocumentContent.

Bold-параграфы → префикс ## (разделы и заголовки таблицы).
Обычный текст — как есть.

Usage:
  python3 scripts/legal/extract-docx-to-json.py INPUT.docx OUTPUT.json
"""
from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def para_text_and_bold(p: ET.Element) -> tuple[str, bool]:
    texts: list[str] = []
    bold = False
    for r in p.findall(".//w:r", NS):
        rpr = r.find("w:rPr", NS)
        if rpr is not None and rpr.find("w:b", NS) is not None:
            bold = True
        for t in r.findall("w:t", NS):
            if t.text:
                texts.append(t.text)
    return "".join(texts).strip(), bold


def extract_paragraphs(docx_path: Path) -> list[str]:
    with ZipFile(docx_path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))

    paragraphs: list[str] = []
    for p in root.findall(".//w:body/w:p", NS):
        text, bold = para_text_and_bold(p)
        if not text:
            continue
        paragraphs.append(f"## {text}" if bold else text)
    return paragraphs


def build_document(paragraphs: list[str]) -> dict[str, object]:
    if not paragraphs:
        raise ValueError("docx не содержит абзацев")
    title = paragraphs[0].removeprefix("## ").strip()
    return {"title": title, "paragraphs": paragraphs}


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "Usage: python3 scripts/legal/extract-docx-to-json.py INPUT.docx OUTPUT.json",
            file=sys.stderr,
        )
        return 2

    docx_path = Path(sys.argv[1]).expanduser().resolve()
    out_path = Path(sys.argv[2]).expanduser().resolve()

    if not docx_path.is_file():
        print(f"Файл не найден: {docx_path}", file=sys.stderr)
        return 1

    paragraphs = extract_paragraphs(docx_path)
    doc = build_document(paragraphs)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"OK: {len(paragraphs)} paragraphs → {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
