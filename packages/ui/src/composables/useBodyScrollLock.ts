import { onUnmounted, type Ref, watch } from "vue";

export function useBodyScrollLock(isLocked: Ref<boolean>) {
  let scrollPosition = 0;

  const lockScroll = () => {
    scrollPosition = window.pageYOffset;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = "100%";
  };

  const unlockScroll = () => {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("width");
    window.scrollTo(0, scrollPosition);
  };

  watch(
    isLocked,
    (locked) => {
      if (locked) {
        lockScroll();
      } else {
        unlockScroll();
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (isLocked.value) {
      unlockScroll();
    }
  });

  return {
    lockScroll,
    unlockScroll,
  };
}
