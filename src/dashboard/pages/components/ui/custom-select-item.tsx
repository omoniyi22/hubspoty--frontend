// Create a new file: frontend/src/components/ui/custom-select-item.tsx
import React from 'react'
import { SelectItem as BaseSelectItem } from './select'

interface CustomSelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function CustomSelectItem({ value, children, className = '' }: CustomSelectItemProps) {
  return (
    <BaseSelectItem 
      value={value} 
      className={`[&_svg]:hidden ${className}`}
    >
      {children}
    </BaseSelectItem>
  )
}