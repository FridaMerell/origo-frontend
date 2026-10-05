import type { ReactNode } from "react";

// A panel on the sign: a rule, a heading, one subject.
export const signPanelClass = "border-t border-text pt-4";
export const signHeadingClass = "font-display text-lg font-semibold leading-7 text-text";
export const signBodyClass = "text-base leading-7 text-text-muted";
// Running text: ragged right, words divided where the browser can.
export const signTextClass = "hyphens-auto";
// A photograph stands on the sheet as it is, with no frame; the tint shows
// where it will be until it has arrived.
export const signPrintClass = "overflow-hidden bg-surface-2";

/**
 * A printed fact table: label and value at either end of a dotted leader,
 * between two rules. Rows fade in where they stand, so one that is read later
 * than the others arrives without moving them.
 */
export function SignFacts({ facts, children, className = "" }: { facts: Array<[label: string, value: ReactNode, source?: number]>; children?: ReactNode; className?: string }) {
  return (
    <dl className={`border-y border-text py-3 ${className}`}>
      {facts.map(([label, value, source]) => (
        <div key={label} className="apsis-arrive flex items-baseline py-0.5">
          <dt className="whitespace-nowrap font-semibold text-text">{label}</dt>
          <span aria-hidden="true" className="apsis-leader" />
          <dd className="max-w-[65%] text-right">{value}{source !== undefined && <SourceRef number={source} />}</dd>
        </div>
      ))}
      {children}
    </dl>
  );
}

/** A source as the sign lists it along its bottom row. */
export type SignSource = { number: number; label: string; href?: string };

/**
 * The small raised numbers after a statement, as a printed note sets them:
 * each leads to its source on the same sign. Several are set off by commas.
 */
export function SourceRefs({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) return null;
  return (
    <sup className="apsis-ref">
      {numbers.map((number, index) => (
        <span key={number}>
          {index > 0 && ","}
          <a href={`#kalla-${number}`} aria-label={`Källa ${number}`}>{number}</a>
        </span>
      ))}
    </sup>
  );
}

/** One raised source number. */
export function SourceRef({ number }: { number: number }) {
  return <SourceRefs numbers={[number]} />;
}

/** The sign's sources, each beside the number the text refers to it by. */
export function SignSources({ sources }: { sources: SignSource[] }) {
  return (
    <section aria-label="Källor">
      <h2 className="font-display text-base font-semibold text-text">Källor</h2>
      <ol className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        {sources.map(({ number, label, href }) => (
          <li key={number} id={`kalla-${number}`} className="apsis-source contents">
            <span className="text-right tabular-nums text-text-faint">{number}</span>
            <span>{href ? <a className="apsis-link" href={href} target="_blank" rel="noreferrer">{label}</a> : label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * One old information sign, the printed kind that stands outside a church:
 * the title centred in spaced capitals between double rules, the content set
 * beneath it and the publisher's row along the bottom. No frame and no colour
 * field; the page itself is the sheet. Every Apsis page is one such sign.
 */
export function Sign({
  title,
  lead,
  figure,
  smallFigure = false,
  action,
  imprint,
  children,
}: {
  title: ReactNode;
  /** A drawing beside the title. */
  figure?: ReactNode;
  /** The drawing is small enough to stand beside the title on a phone. */
  smallFigure?: boolean;
  /** What the page is for doing, under the lead; only shown beside a drawing. */
  action?: ReactNode;
  /** The line under the title, between the same rules. */
  lead?: ReactNode;
  /** The bottom row: who the text comes from. */
  imprint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="container py-6 sm:py-10">
      {/* The language is stated so the browser can divide words in the columns. */}
      <article lang="sv" className="px-6 md:px-0">
        {figure ? (
          // With a drawing the title stands to its left, as on a sign's top row.
          // Below lg the title, lead and action are grid items of their own:
          // a small drawing then stands beside the title, a large one under
          // everything at full width.
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-y-4 border-double border-text py-6 sm:py-8 lg:grid-cols-3 lg:gap-x-10">
            <div className="contents lg:col-span-2 lg:block">
              {/* Sizes are Apsis's own scale, where text-lg is 23px and text-4xl 36px. */}
              <h1 className="font-display text-4xl font-semibold uppercase tracking-widest text-text sm:text-5xl">{title}</h1>
              {lead && <p className="col-span-2 mt-3 max-w-prose text-base italic leading-7 text-text-muted sm:mt-4 sm:text-lg sm:leading-8">{lead}</p>}
              {action && <div className="col-span-2 mt-5">{action}</div>}
            </div>
            <div className={smallFigure ? "col-start-2 row-start-1 lg:col-start-3" : "col-span-2 mt-6 lg:col-span-1 lg:mt-0"}>{figure}</div>
          </header>
        ) : (
          <header className="border-y-4 border-double border-text py-6 text-center sm:py-8">
            <h1 className="font-display text-4xl font-semibold uppercase tracking-widest text-text sm:text-5xl">{title}</h1>
            {lead && <p className="mx-auto mt-3 max-w-prose text-base italic leading-7 text-text-muted sm:text-lg sm:leading-8">{lead}</p>}
          </header>
        )}
        <div className="pt-8">{children}</div>
        {imprint && (
          <footer className="mt-10 border-t border-text pt-4 text-sm leading-6 text-text-muted">
            {imprint}
          </footer>
        )}
      </article>
    </div>
  );
}
