import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { initialData } from "@/lib/data"

// 数据存储路径 - 在项目根目录下的 data 文件夹
const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "store.json")

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    try {
      const fileContent = await fs.readFile(DATA_FILE, "utf-8")
      const data = JSON.parse(fileContent)
      return NextResponse.json(data)
    } catch (error) {
      // 如果文件不存在或解析失败，返回初始数据
      return NextResponse.json({
        data: initialData,
        viewConfig: {
            rowHeight: "中等",
            editMode: false,
            expandedGroups: {
              重要紧急: true,
              紧急不重要: true,
              重要不紧急: true,
            },
            expandedTasks: {},
            headerDraggable: false,
        },
        // ... 其他默认状态可以根据需要在前端合并
      })
    }
  } catch (error) {
    console.error("Failed to read data:", error)
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataDir()
    const data = await request.json()
    
    // 写入文件
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save data:", error)
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 })
  }
}
