export interface OffsetRange {
  readonly start: number;
  readonly end: number;
}

export interface EmbeddedDocument {
  readonly content: string;
  readonly ranges: readonly OffsetRange[];
}

/**
 * Preserve JSXGraph fence contents and source offsets while masking all other
 * Markdown text. Declarations are appended after the original document so
 * positions returned by a delegated language provider remain valid.
 */
export function createEmbeddedDocument(
  source: string,
  declarations: string,
): EmbeddedDocument {
  const output = source.replace(/[^\r\n]/g, " ").split("");
  const ranges: OffsetRange[] = [];
  const lines = source.match(/.*(?:\r\n|\n|\r|$)/g) ?? [];
  let offset = 0;
  let fence:
    | { marker: string; length: number; contentStart: number }
    | undefined;

  for (const lineWithEnding of lines) {
    if (!lineWithEnding) {
      continue;
    }
    const line = lineWithEnding.replace(/[\r\n]+$/, "");

    if (!fence) {
      const opening = line.match(
        /^( {0,3})(`{3,}|~{3,})\s*([^\s`~]+)?[^\r\n]*$/,
      );
      if (opening && (opening[3] ?? "").toLowerCase() === "jsxgraph") {
        fence = {
          marker: opening[2][0],
          length: opening[2].length,
          contentStart: offset + lineWithEnding.length,
        };
      }
    } else {
      const closing = line.match(/^( {0,3})(`{3,}|~{3,})\s*$/);
      if (
        closing &&
        closing[2][0] === fence.marker &&
        closing[2].length >= fence.length
      ) {
        copyRange(source, output, fence.contentStart, offset);
        ranges.push({ start: fence.contentStart, end: offset });
        fence = undefined;
      }
    }

    offset += lineWithEnding.length;
  }

  if (fence) {
    copyRange(source, output, fence.contentStart, source.length);
    ranges.push({ start: fence.contentStart, end: source.length });
  }

  return {
    content: `${output.join("")}\n${declarations}\ndeclare const BOARDID: string;\n`,
    ranges,
  };
}

export function containsOffset(
  ranges: readonly OffsetRange[],
  offset: number,
): boolean {
  return ranges.some((range) => offset >= range.start && offset < range.end);
}

function copyRange(
  source: string,
  output: string[],
  start: number,
  end: number,
): void {
  for (let index = start; index < end; index += 1) {
    output[index] = source[index];
  }
}
