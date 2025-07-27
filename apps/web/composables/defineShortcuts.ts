import { onMounted, onUnmounted } from "vue";

type ShortcutHandler = () => void | Promise<void> | any;
type ShortcutMap = Record<string, ShortcutHandler>;

export const defineShortcuts = (shortcuts: ShortcutMap) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey;
    const cmd = event.metaKey;
    const alt = event.altKey;
    const shift = event.shiftKey;

    // Build shortcut string
    const parts: string[] = [];
    if (cmd || ctrl) parts.push("cmd");
    if (alt) parts.push("alt");
    if (shift) parts.push("shift");
    if (
      key &&
      key !== "meta" &&
      key !== "control" &&
      key !== "alt" &&
      key !== "shift"
    ) {
      parts.push(key);
    }

    const shortcut = parts.join("-");

    // Check for matching shortcut
    if (shortcuts[shortcut]) {
      event.preventDefault();
      shortcuts[shortcut]();
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
};
