import { useRef } from "react";

interface Props {
  axis: "x" | "y";
  onResize: (delta: number) => void;
  label: string;
  className?: string;
}

export function ResizeHandle({ axis, onResize, label, className = "" }: Props) {
  const last = useRef(0);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    last.current = axis === "x" ? e.clientX : e.clientY;
    const move = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const pos = axis === "x" ? ev.clientX : ev.clientY;
      const delta = pos - last.current;
      if (delta !== 0) { last.current = pos; onResize(delta); }
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 24 : 8;
    const keys = axis === "x" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    onResize((e.key === keys[1] ? 1 : -1) * step);
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      tabIndex={0}
      title={label}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`group z-20 shrink-0 touch-none focus-visible:bg-ide-blue/50 focus-visible:outline-none ${
        axis === "x" ? "w-1.5 cursor-col-resize self-stretch" : "h-1.5 w-full cursor-row-resize"
      } ${className}`}
    >
      <div className={`bg-transparent transition-colors group-hover:bg-ide-blue/60 group-active:bg-ide-blue ${axis === "x" ? "mx-auto h-full w-px group-hover:w-0.5" : "my-auto h-px w-full group-hover:h-0.5"}`} />
    </div>
  );
}
