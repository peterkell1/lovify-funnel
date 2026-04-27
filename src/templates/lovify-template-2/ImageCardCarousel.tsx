"use client";

import useEmblaCarousel from "embla-carousel-react";
import { HiChevronRight, HiPhoto } from "react-icons/hi2";

type CardOption = {
  value: string;
  label: string;
  imageUrl: string | null;
  disabled?: boolean;
  selected?: boolean;
};

type Props = {
  options: CardOption[];
  onSelect: (value: string) => void;
};

export function ImageCardCarousel({ options, onSelect }: Props) {
  const [emblaRef] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: false,
  });

  return (
    <>
      {/* Mobile: embla carousel — py/px gives room for the selection border */}
      <div className="md:hidden w-full overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 px-6 py-2">
          {options.map((opt) => (
            <Card key={opt.value} opt={opt} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {/* Desktop: plain flex row, centered */}
      <div className="hidden md:flex items-stretch justify-center gap-6 py-2">
        {options.map((opt) => (
          <Card key={opt.value} opt={opt} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}

function Card({ opt, onSelect }: { opt: CardOption; onSelect: (v: string) => void }) {
  return (
    <button
      type="button"
      disabled={opt.disabled}
      onClick={() => onSelect(opt.value)}
      className={
        "relative bg-[var(--lt2-card)] text-left flex-shrink-0 transition-all duration-200 overflow-hidden " +
        (opt.selected
          ? "opacity-100"
          : opt.disabled
          ? "opacity-40"
          : "opacity-100")
      }
      style={{
        width: 167,
        height: 283,
        borderRadius: 18,
        minWidth: 167,
        // Use outline instead of ring/border so it draws outside the box
        // and is never clipped by overflow-hidden on the card itself.
        outline: opt.selected ? "4px solid var(--lt2-accent)" : "4px solid transparent",
        outlineOffset: "3px",
        transition: "outline-color 0.2s, opacity 0.2s",
      }}
    >
      {opt.imageUrl ? (
        <img
          src={opt.imageUrl}
          alt={opt.label}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--lt2-card)] flex items-center justify-center">
          <HiPhoto className="h-10 w-10 text-[var(--lt2-border)]" />
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between"
        style={{ background: "#311E17", padding: "16px 12px" }}
      >
        <span
          className="lt2-headline text-[#FFFEFA]"
          style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}
        >
          {opt.label}
        </span>
        <span className="inline-flex items-center justify-center rounded-full border-2 border-[#FFFEFA] w-8 h-8 flex-shrink-0">
          <HiChevronRight className="h-4 w-4 text-[#FFFEFA]" />
        </span>
      </div>
    </button>
  );
}
