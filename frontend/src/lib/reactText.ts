import { Children, isValidElement, type ReactNode } from "react";

/** Flattens a React node tree into plain text (for structured data). */
export function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return Children.toArray(node.props.children).map(nodeToText).join("");
  }

  return "";
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
