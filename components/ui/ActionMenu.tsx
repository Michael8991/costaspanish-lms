"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

export type ActionMenuItem = {
  id?: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  separatorBefore?: boolean;
  variant?: "default" | "danger";
};

export interface ActionMenuProps {
  items: ActionMenuItem[];
  triggerLabel: string;
  menuLabel?: string;
  triggerClassName?: string;
}

type MenuPosition = {
  top: number;
  left: number;
  opensAbove: boolean;
};

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;

export default function ActionMenu({
  items,
  triggerLabel,
  menuLabel = triggerLabel,
  triggerClassName = "",
}: ActionMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;

    if (!trigger || !menu) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const availableBelow = window.innerHeight - triggerRect.bottom;
    const opensAbove =
      availableBelow < menuRect.height + MENU_GAP &&
      triggerRect.top >= menuRect.height + MENU_GAP;
    const preferredTop = opensAbove
      ? triggerRect.top - menuRect.height - MENU_GAP
      : triggerRect.bottom + MENU_GAP;
    const preferredLeft = triggerRect.right - menuRect.width;

    setPosition({
      top: Math.min(
        Math.max(VIEWPORT_MARGIN, preferredTop),
        Math.max(VIEWPORT_MARGIN, window.innerHeight - menuRect.height - VIEWPORT_MARGIN),
      ),
      left: Math.min(
        Math.max(VIEWPORT_MARGIN, preferredLeft),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - menuRect.width - VIEWPORT_MARGIN),
      ),
      opensAbove,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const frameId = window.requestAnimationFrame(updatePosition);

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || !position) return;

    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    );
    firstItem?.focus();
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [closeMenu, isOpen, updatePosition]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );

    if (menuItems.length === 0) return;

    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
    let nextIndex = 0;

    if (event.key === "End") {
      nextIndex = menuItems.length - 1;
    } else if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex < 0
          ? menuItems.length - 1
          : (currentIndex - 1 + menuItems.length) % menuItems.length;
    }

    menuItems[nextIndex]?.focus();
  }

  const menu = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={handleMenuKeyDown}
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, scale: 0.97, y: position?.opensAbove ? 3 : -3 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.98, y: position?.opensAbove ? 2 : -2 }
          }
          transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
          className={`menu-dropdown fixed z-9999 flex max-h-[calc(100vh-1rem)] min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-y-auto rounded-xl border border-gray-200/60 bg-white p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] ${
            position?.opensAbove ? "origin-bottom-right" : "origin-top-right"
          }`}
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            visibility: position ? "visible" : "hidden",
          }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isDanger = item.variant === "danger";
            const itemClasses = `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#9e2727]/25 ${
              isDanger
                ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:bg-gray-50"
            } ${item.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`;
            const content = (
              <>
                {Icon && (
                  <Icon
                    aria-hidden="true"
                    size={17}
                    className={`shrink-0 transition-colors duration-150 ${
                      isDanger
                        ? "text-red-400 group-hover:text-red-500"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                )}
                <span>{item.label}</span>
              </>
            );

            return (
              <div key={item.id ?? item.label}>
                {item.separatorBefore && (
                  <div role="separator" className="my-1 h-px bg-gray-100" />
                )}
                {item.href && !item.disabled ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    className={itemClasses}
                    onClick={() => closeMenu()}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    aria-disabled={item.disabled || undefined}
                    disabled={item.disabled}
                    className={itemClasses}
                    onClick={() => {
                      if (item.disabled) return;
                      item.onSelect?.();
                      closeMenu();
                    }}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            setPosition(null);
            setIsOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setPosition(null);
            setIsOpen(true);
          }
        }}
        className={`menu-button flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg p-2 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#9e2727]/30 focus-visible:ring-offset-2 ${
          isOpen
            ? "bg-gray-100 text-gray-700"
            : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        } ${triggerClassName}`}
      >
        <MoreVertical size={20} aria-hidden="true" />
      </button>

      {isMounted && createPortal(menu, document.body)}
    </>
  );
}
