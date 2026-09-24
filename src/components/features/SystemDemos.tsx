"use client";

import clsx from "clsx";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Notch } from "@/components/notch/Notch";
import { ChargeReadout, type ChargeKind, type LevelKey, LevelKeys, LevelReadout, useLevels } from "@/components/surfaces/Levels";
import { Band, Stage, type StageSize } from "./Stage";

/*
 * The two readouts that drop out of the closed notch for a moment and go back:
 * levels (for 1.3 s after the last key, as the app does) and power (2.2 s for
 * the cable, 3 s for a low-battery warning). Both stages are drawn tight round
 * the 227 × 78 activity panel so the readout is legible at any width.
 *
 * Until the first press each stage holds its readout open — volume at 50%, the
 * cable in at 80% — so neither sits as an empty pill. Nothing runs to do that:
 * it is a still state, and the first press hands over to the real behaviour.
 */

const SIZE: StageSize = { width: 400, height: 90 };
const PHONE: StageSize = { width: 290, height: 88 };

function Hung({ open, contentKey, children }: { open: boolean; contentKey: string; children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0">
      <Notch state={open ? "activity" : "collapsed"} contentKey={contentKey}>
        {children}
      </Notch>
    </div>
  );
}

/** Volume and brightness, driven by the function row below the drawing. */
export function LevelsDemo() {
  const levels = useLevels({ volume: 0.5, brightness: 0.75, muted: false });
  const { state, kind, visible } = levels;
  const [touched, setTouched] = useState(false);
  const press = (key: LevelKey, fine: boolean) => {
    setTouched(true);
    levels.press(key, fine);
  };
  return (
    <div>
      <Stage size={SIZE} phone={PHONE} maxScale={1.5}>
        {() => (
          <>
            <Band />
            <Hung open={visible || !touched} contentKey={kind}>
              <LevelReadout kind={kind} value={kind === "volume" ? state.volume : state.brightness} muted={state.muted} />
            </Hung>
          </>
        )}
      </Stage>
      <LevelKeys onPress={press} announce={levels.announce} className="mt-4 -ml-[6px] sm:mt-5" />
    </div>
  );
}

type Power = { kind: ChargeKind; percent: number; token: number };

const LOW = [20, 10, 5] as const;

/**
 * Power: the cable in and out, and the three low-battery warnings. Each press
 * raises the readout afresh (a new token replays its entrance) and the notch
 * closes again 2.2 s later for the cable, 3 s for a warning — AppDelegate's
 * handlePower. The timer is dropped when the tab is hidden.
 */
export function PowerDemo() {
  const [power, setPower] = useState<Power>({ kind: "connected", percent: 80, token: 0 });
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const plugged = power.kind === "connected";

  const raise = (kind: ChargeKind, percent: number) => {
    setPower((p) => ({ kind, percent, token: p.token + 1 }));
    setOpen(true);
    setTouched(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), kind === "low" ? 3000 : 2200);
  };

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        window.clearTimeout(timer.current);
        setOpen(false);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.clearTimeout(timer.current);
    };
  }, []);

  const shown = open || !touched;
  const said = open
    ? power.kind === "low"
      ? `Low battery, ${power.percent}%`
      : power.kind === "connected"
        ? `Charging, ${power.percent}%`
        : `On battery, ${power.percent}%`
    : "";

  return (
    <div>
      <Stage size={SIZE} phone={PHONE} maxScale={1.5}>
        {() => (
          <>
            <Band />
            <Hung open={shown} contentKey={`power-${power.token}`}>
              <ChargeReadout key={power.token} kind={power.kind} percent={power.percent} />
            </Hung>
          </>
        )}
      </Stage>
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
        <Key onClick={() => raise(plugged ? "disconnected" : "connected", 80)}>{plugged ? "Unplug" : "Plug in"}</Key>
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-hair" />
        {LOW.map((n) => (
          <Key key={n} label={`Run down to ${n}%`} onClick={() => raise("low", n)}>
            <span className="tnum">{n}%</span>
          </Key>
        ))}
        <span className="sr-only" aria-live="polite">
          {said}
        </span>
      </div>
    </div>
  );
}

function Key({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "inline-flex h-[42px] min-w-[54px] cursor-pointer items-center justify-center rounded-[6px] border border-hair bg-plane-deep px-3.5",
        "font-[family-name:var(--font-system)] text-[13px] text-ink-2 shadow-[inset_0_1px_0_var(--color-hair),0_2px_0_var(--color-fascia)]",
        "transition-[transform,box-shadow,color] duration-100 hover:text-ink active:translate-y-px active:shadow-[inset_0_1px_0_var(--color-hair),0_1px_0_var(--color-fascia)]",
      )}
    >
      {children}
    </button>
  );
}
