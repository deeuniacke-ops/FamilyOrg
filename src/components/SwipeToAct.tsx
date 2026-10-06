"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 60;

/** Wraps an activity row so swiping it sideways (past SWIPE_THRESHOLD)
 *  calls onTrigger instead of letting the tap underneath (e.g. a Link)
 *  fire - the row springs back and the caller decides what happens next
 *  (e.g. show a cancel/delete action sheet). */
export default function SwipeToAct({ children, onTrigger }: { children: React.ReactNode; onTrigger: () => void }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const justSwiped = useRef(false);
  const [translateX, setTranslateX] = useState(0);
  const [animate, setAnimate] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = true;
    setAnimate(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) < Math.abs(dy)) return; // vertical scroll - leave it alone
    e.preventDefault();
    setTranslateX(Math.max(-90, Math.min(90, dx)));
  };

  const handleTouchEnd = () => {
    dragging.current = false;
    setAnimate(true);
    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      justSwiped.current = true;
      onTrigger();
    }
    setTranslateX(0);
  };

  // A swipe shouldn't also trigger the Link/button underneath it
  const handleClickCapture = (e: React.MouseEvent) => {
    if (justSwiped.current) {
      e.preventDefault();
      e.stopPropagation();
      justSwiped.current = false;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClickCapture={handleClickCapture}
      style={{ transform: `translateX(${translateX}px)`, transition: animate ? "transform 0.2s ease" : "none" }}
    >
      {children}
    </div>
  );
}
