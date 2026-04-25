import { useState } from 'react'

interface SidebarItem {
  label: string
  icon: string
}

interface SidebarProps {
  items: SidebarItem[]
  activeIndex?: number
  onItemClick?: (index: number) => void
}

export default function Sidebar({ items, activeIndex = 0, onItemClick }: SidebarProps) {
  const [active, setActive] = useState(activeIndex)

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border p-4">
      <nav className="space-y-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              setActive(index)
              onItemClick?.(index)
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              active === index
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}