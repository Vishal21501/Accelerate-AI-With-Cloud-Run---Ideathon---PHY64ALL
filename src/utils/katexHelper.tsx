import React, { useMemo } from "react";
import katex from "katex";

interface KatexMathProps {
  math: string;
  inline?: boolean;
  className?: string;
}

export const KatexMath: React.FC<KatexMathProps> = ({
  math,
  inline = false,
  className = "",
}) => {
  const html = useMemo(() => {
    if (!math) return "";
    try {
      return katex.renderToString(math, {
        displayMode: !inline,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch {
      return math;
    }
  }, [math, inline]);

  if (inline) {
    return (
      <span
        className={`inline-block font-mono ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      className={`overflow-x-auto py-1 text-center ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface MathTextProps {
  text: string;
  className?: string;
}

// Sub-component to render inline elements (LaTeX math $...$, bold **...**, code `...`)
export const InlineFormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    if (!text) return [];
    // Match inline math $...$, bold **...**, and inline code `...`
    const regex = /(\$[^\$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`)/g;
    const tokens: Array<{ type: "text" | "math" | "bold" | "code"; content: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }
      const raw = match[0];
      if (raw.startsWith("$") && raw.endsWith("$")) {
        tokens.push({
          type: "math",
          content: raw.slice(1, -1).trim(),
        });
      } else if (raw.startsWith("**") && raw.endsWith("**")) {
        tokens.push({
          type: "bold",
          content: raw.slice(2, -2).trim(),
        });
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        tokens.push({
          type: "code",
          content: raw.slice(1, -1).trim(),
        });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return tokens;
  }, [text]);

  return (
    <>
      {parts.map((p, idx) => {
        if (p.type === "math") {
          return <KatexMath key={idx} math={p.content} inline={true} />;
        }
        if (p.type === "bold") {
          return (
            <strong key={idx} className="font-semibold text-slate-900">
              {p.content}
            </strong>
          );
        }
        if (p.type === "code") {
          return (
            <code
              key={idx}
              className="px-1 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px]"
            >
              {p.content}
            </code>
          );
        }
        return <span key={idx}>{p.content}</span>;
      })}
    </>
  );
};

export const MathText: React.FC<MathTextProps> = ({ text, className = "" }) => {
  const blocks = useMemo(() => {
    if (!text) return [];

    // Step 1: Extract block equations ($$...$$) first
    const rawBlocks: Array<{ type: "block_math" | "markdown"; content: string }> = [];
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    let lastIdx = 0;
    let bMatch: RegExpExecArray | null;

    while ((bMatch = blockMathRegex.exec(text)) !== null) {
      if (bMatch.index > lastIdx) {
        rawBlocks.push({
          type: "markdown",
          content: text.slice(lastIdx, bMatch.index),
        });
      }
      rawBlocks.push({
        type: "block_math",
        content: bMatch[1].trim(),
      });
      lastIdx = blockMathRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      rawBlocks.push({
        type: "markdown",
        content: text.slice(lastIdx),
      });
    }

    // Step 2: For each markdown segment, break into lines / paragraphs / headers / lists
    const structured: Array<
      | { type: "block_math"; content: string }
      | { type: "h2"; content: string }
      | { type: "h3"; content: string }
      | { type: "h4"; content: string }
      | { type: "bullet"; content: string }
      | { type: "numbered"; content: string; number: string }
      | { type: "p"; content: string }
    > = [];

    for (const seg of rawBlocks) {
      if (seg.type === "block_math") {
        structured.push({ type: "block_math", content: seg.content });
        continue;
      }

      const paragraphs = seg.content.split(/\n\s*\n/);
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const lines = trimmed.split("\n");
        let currentP: string[] = [];

        for (const line of lines) {
          const lTrim = line.trim();
          if (!lTrim) continue;

          if (lTrim.startsWith("### ")) {
            if (currentP.length > 0) {
              structured.push({ type: "p", content: currentP.join(" ") });
              currentP = [];
            }
            structured.push({ type: "h4", content: lTrim.slice(4).trim() });
          } else if (lTrim.startsWith("## ")) {
            if (currentP.length > 0) {
              structured.push({ type: "p", content: currentP.join(" ") });
              currentP = [];
            }
            structured.push({ type: "h3", content: lTrim.slice(3).trim() });
          } else if (lTrim.startsWith("# ")) {
            if (currentP.length > 0) {
              structured.push({ type: "p", content: currentP.join(" ") });
              currentP = [];
            }
            structured.push({ type: "h2", content: lTrim.slice(2).trim() });
          } else if (lTrim.startsWith("- ") || lTrim.startsWith("* ")) {
            if (currentP.length > 0) {
              structured.push({ type: "p", content: currentP.join(" ") });
              currentP = [];
            }
            structured.push({ type: "bullet", content: lTrim.slice(2).trim() });
          } else if (/^\d+\.\s/.test(lTrim)) {
            if (currentP.length > 0) {
              structured.push({ type: "p", content: currentP.join(" ") });
              currentP = [];
            }
            const numMatch = lTrim.match(/^(\d+)\.\s*(.*)$/);
            if (numMatch) {
              structured.push({
                type: "numbered",
                number: numMatch[1],
                content: numMatch[2].trim(),
              });
            } else {
              structured.push({ type: "bullet", content: lTrim });
            }
          } else {
            currentP.push(lTrim);
          }
        }

        if (currentP.length > 0) {
          structured.push({ type: "p", content: currentP.join(" ") });
        }
      }
    }

    return structured;
  }, [text]);

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "block_math") {
          return (
            <div
              key={idx}
              className="my-2.5 p-2.5 bg-white rounded-lg border border-slate-200/80 overflow-x-auto shadow-xs"
            >
              <KatexMath math={block.content} inline={false} />
            </div>
          );
        }
        if (block.type === "h2") {
          return (
            <h2 key={idx} className="text-base font-bold text-slate-900 mt-3 mb-1">
              <InlineFormattedText text={block.content} />
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="text-sm font-bold text-blue-950 mt-3 mb-1 flex items-center gap-1.5">
              <InlineFormattedText text={block.content} />
            </h3>
          );
        }
        if (block.type === "h4") {
          return (
            <h4
              key={idx}
              className="text-xs uppercase tracking-wider font-bold text-blue-800 mt-2.5 mb-1 flex items-center gap-1"
            >
              <InlineFormattedText text={block.content} />
            </h4>
          );
        }
        if (block.type === "bullet") {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-slate-700 leading-relaxed text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
              <div>
                <InlineFormattedText text={block.content} />
              </div>
            </div>
          );
        }
        if (block.type === "numbered") {
          return (
            <div key={idx} className="flex items-start gap-2 ml-2 my-1 text-slate-700 leading-relaxed text-sm">
              <span className="text-xs font-bold text-blue-600 shrink-0 w-4">{block.number}.</span>
              <div>
                <InlineFormattedText text={block.content} />
              </div>
            </div>
          );
        }
        return (
          <p key={idx} className="my-1.5 leading-relaxed text-slate-800 text-sm">
            <InlineFormattedText text={block.content} />
          </p>
        );
      })}
    </div>
  );
};

