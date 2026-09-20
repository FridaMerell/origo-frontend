/** Trigger a client-side download of one generated file, named after its path's basename. */
export function downloadTextFile(path: string, content: string) {
  const name = path.split("/").pop() || "fil.txt"
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
