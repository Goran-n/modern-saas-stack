<template>
  <div
    ref="containerRef"
    class="overflow-auto"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div
        v-for="item in visibleItems"
        :key="keyFn(item.data)"
        :style="{
          position: 'absolute',
          top: `${item.offset}px`,
          left: 0,
          right: 0,
          height: `${itemHeight}px`
        }"
      >
        <slot
          :item="item.data"
          :index="item.index"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  buffer?: number
  keyFn?: (item: T) => string | number
}

const props = withDefaults(defineProps<VirtualListProps<T>>(), {
  buffer: 5,
  keyFn: (item: T) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return (item as any).id
    }
    return JSON.stringify(item)
  }
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const containerHeight = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
  const end = Math.min(
    props.items.length,
    Math.ceil((scrollTop.value + containerHeight.value) / props.itemHeight) + props.buffer
  )
  
  return { start, end }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  
  return props.items.slice(start, end).map((item, index) => ({
    data: item,
    index: start + index,
    offset: (start + index) * props.itemHeight
  }))
})

function handleScroll() {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})
</script>