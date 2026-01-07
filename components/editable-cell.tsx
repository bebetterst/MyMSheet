"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface EditableCellProps {
  value: string | number | null | undefined
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  className?: string
  type?: string
}

const EditableCell: React.FC<EditableCellProps> = ({ value, onChange, onSave, className, type = "text" }) => {
  // 辅助函数：格式化值为 input 所需格式
  const formatForInput = (val: any, inputType: string) => {
    if (val === null || val === undefined) return ""
    const strVal = val.toString()
    if (inputType === "date") {
      // 确保日期格式为 YYYY-MM-DD
      return strVal.replace(/\//g, "-")
    }
    return strVal
  }

  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(formatForInput(value, type))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(formatForInput(value, type))
  }, [value, type])

  const handleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    // 如果是日期类型，保存时转换回 YYYY/MM/DD 格式以保持一致性
    let valToSave = inputValue
    if (type === "date" && inputValue) {
        valToSave = inputValue.replace(/-/g, "/")
    }
    
    onChange && onChange(valToSave)
    onSave && onSave(valToSave)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setInputValue(formatForInput(value, type))
    }
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  if (isEditing) {
    return (
        <input
            ref={inputRef}
            type={type}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="border rounded px-1 py-0.5 w-full"
        />
    )
  }

  return (
      <div
          className={cn(
              "editable-cell cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded whitespace-nowrap overflow-hidden text-overflow-ellipsis",
              className,
          )}
          onClick={handleClick}
      >
        {value || <span className="text-gray-400 italic">点击编辑</span>}
      </div>
  )
}

export default EditableCell
