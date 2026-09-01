"use client"

import { useEffect, useState } from "react"
import Image, { type StaticImageData } from "next/image"
import { logout } from "@/app/actions/auth"
import { LoginForm } from "@/app/login/login-form"
import { useUser } from "@/app/lib/user-context"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"
import apsisIcon from "./apsis/icon.png"
import fluxIcon from "./flux/icon.png"
import tempusIcon from "./tempus/icon.png"
import versoIcon from "./verso/icon.png"

const APP_ICONS: Record<string, StaticImageData> = {
  apsis: apsisIcon,
  flux: fluxIcon,
  tempus: tempusIcon,
  verso: versoIcon,
}
const APP_NOTE: Record<string, string> = {
  verso: "Fastighetsnav",
  flux: "Projekthantering",
  tempus: "Artrikedom och säsonger",
  apsis: "Verkligen bara absider",
}
const APP_DESCRIPTION: Record<string, string> = {
  verso:
    "Besökskalender, projekthantering, ekonomi och viktiga dokument för hus eller sommarstugor.",
  flux: "Projekthantering med milstolpar, uppgifter, dokumentation och deadlines.",
  tempus:
    "Taxonomisk data, säsongsbedömningar och biotoper för arter. Men även observationer, krysslistor, hjälp att planera utflykter och en ML-mottagare för automatisk klassificering av fågelsång.",
  apsis: "Det är på riktigt bara bilder på absider.",
}

// Add a public path here when a product screenshot is available, for example
// { flux: "/screenshots/flux.png" }. The layout automatically uses it.
const APP_SCREENSHOTS: Record<string, string> = {}

export default function RootHome() {
  const user = useUser()
  const [hrefs, setHrefs] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)
  useEffect(() => {
    setHrefs(
      Object.fromEntries(APP_LINKS.map(app => [app.id, appHref(app.id)])),
    )
  }, [])
  const apps = APP_LINKS.filter(app => app.id !== "origo")
  const previewApp = preview ? apps.find(app => app.id === preview.id) : null
  const updatePreview = (id: string, x: number, y: number) => {
    const margin = 16
    const offset = 18
    const width = Math.min(280, window.innerWidth - margin * 2)
    const height = Math.min(324, window.innerHeight - margin * 2)
    const left =
      x + offset + width <= window.innerWidth - margin
        ? x + offset
        : x - offset - width
    const top =
      y + offset + height <= window.innerHeight - margin
        ? y + offset
        : y - offset - height
    setPreview({
      id,
      x: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
      y: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
    })
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-[#E7E5DE] px-5 py-6 text-[#1B252B] sm:px-10 sm:py-10'>
      <span
        aria-hidden
        className='absolute left-1/2 top-0 h-full w-px bg-[#1B252B]/15'
      />
      <span
        aria-hidden
        className='absolute left-0 top-1/2 h-px w-full bg-[#1B252B]/15'
      />
      <div className='relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col'>
        <header className='flex items-center justify-between'>
          <span className='font-(family-name:--font-geist-mono) text-[11px] font-medium uppercase tracking-[0.18em]'>
            ORIGO / 00°00′
          </span>
          {user && (
            <div className='flex items-center gap-4'>
              <a
                href='/konto'
                className='font-(family-name:--font-geist-mono) text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
                Konto
              </a>
              <a
                href='/docs'
                className='font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
                Dokumentation
              </a>
              <a
                href='/konto/anslutningar'
                className='font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
                Anslutningar
              </a>
              <button
                type='button'
                onClick={() =>
                  void logout().then(() => window.location.reload())
                }
                className='font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.12em] underline underline-offset-4'>
                Logga ut
              </button>
            </div>
          )}
        </header>
        <section className='flex flex-1 flex-col justify-center py-16'>
          <div className='flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between'>
            <div className='relative max-w-3xl bg-[#E7E5DE]/90 py-5'>
              <span className='mb-5 flex size-12 items-center justify-center rounded-full border border-[#1B252B] font-(family-name:--font-geist-mono) text-xs'>
                0,0
              </span>
              <p className='font-(family-name:--font-geist-mono) text-[11px] uppercase tracking-[0.18em] text-[#58636A]'>
                Gemensam utgångspunkt
              </p>
              <h1 className='mt-3 text-5xl font-medium tracking-[-0.06em] sm:text-7xl'>
                Ett inlogg.
                <br />
                Mycket dumt.
              </h1>
            </div>
            {!user && (
              <aside className='w-full max-w-sm border-l border-[#1B252B] bg-[#E7E5DE]/90 pl-5 pb-2'>
                <p className='font-(family-name:--font-geist-mono) text-[10px] uppercase tracking-[0.16em] text-[#58636A]'>
                  Identifiera dig
                </p>
                <p className='mt-2 text-sm text-[#58636A]'>
                  Annars blir du inte insläppt
                </p>
                <div className='mt-5 [&_button]:rounded-sm [&_button]:bg-[#1B252B] [&_button]:font-(family-name:--font-geist-mono) [&_button]:text-xs [&_button]:uppercase [&_button]:tracking-[0.12em] [&_button]:text-[#F4F2EC] [&_input]:rounded-sm [&_input]:border-[#1B252B]/30 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2 [&_input]:text-[#1B252B] [&_label]:font-[family-name:var(--font-geist-mono)] [&_label]:text-[10px] [&_label]:uppercase [&_label]:tracking-[0.12em] [&_label]:text-[#58636A]'>
                  <LoginForm buttonClass='hover:bg-[#58636A]' />
                </div>
              </aside>
            )}
          </div>
          <div className='mt-10 max-w-4xl border-l border-[#1B252B] bg-[#E7E5DE]/90'>
            {apps.map((app, index) => {
              const screenshot = APP_SCREENSHOTS[app.id]
              return (
                <a
                  key={app.id}
                  href={hrefs[app.id] ?? "#"}
                  onPointerEnter={event =>
                    updatePreview(app.id, event.clientX, event.clientY)
                  }
                  onPointerMove={event =>
                    updatePreview(app.id, event.clientX, event.clientY)
                  }
                  onPointerLeave={() => setPreview(null)}
                  className='group flex items-center gap-4 border-b border-[#1B252B]/20 px-5 py-4 no-underline transition-colors hover:bg-[#1B252B] hover:text-[#F4F2EC] sm:gap-6 sm:px-6 sm:py-5'>
                  <span className='font-(family-name:--font-geist-mono) text-[11px] text-[#58636A] group-hover:text-[#C9D0CE]'>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className='flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-current/20 bg-white/35 sm:size-24'>
                    {screenshot ? (
                      <Image
                        src={screenshot}
                        alt={app.name + " skärmdump"}
                        width={192}
                        height={120}
                        className='size-full object-cover object-top'
                      />
                    ) : (
                      <Image
                        src={APP_ICONS[app.id]}
                        alt=''
                        width={64}
                        height={64}
                        className='size-14 object-contain sm:size-16'
                      />
                    )}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-xl font-semibold tracking-tight sm:text-2xl'>
                      {app.name}
                    </span>
                    <span className='font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.1em] text-[#58636A] group-hover:text-[#C9D0CE]'>
                      {APP_NOTE[app.id]}
                    </span>
                  </span>
                  <span className='font-[family-name:var(--font-geist-mono)] text-lg'>
                    ↗
                  </span>
                </a>
              )
            })}
          </div>
          {previewApp && preview && (
            <aside
              aria-hidden
              className='pointer-events-none fixed z-20 max-h-[calc(100dvh-2rem)] w-70 max-w-[calc(100vw-2rem)] overflow-y-auto border border-[#1B252B] bg-[#1B252B] p-4 text-[#F4F2EC] shadow-[7px_7px_0_rgba(27,37,43,0.25)]'
              style={{ left: preview.x, top: preview.y }}>
              <span
                aria-hidden
                className='absolute left-1/2 top-0 h-full w-px bg-[#F4F2EC]/10'
              />
              <span
                aria-hidden
                className='absolute left-0 top-1/2 h-px w-full bg-[#F4F2EC]/10'
              />
              <div className='relative mb-4 flex items-center justify-between border-b border-[#F4F2EC]/25 pb-3'>
                <span className='font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em]'>
                  Punkt 0{apps.indexOf(previewApp) + 1}
                </span>
                <span className='font-[family-name:var(--font-geist-mono)] text-[10px] text-[#C9D0CE]'>
                  ↗
                </span>
              </div>
              {APP_SCREENSHOTS[previewApp.id] ? (
                <Image
                  src={APP_SCREENSHOTS[previewApp.id]}
                  alt=''
                  width={560}
                  height={320}
                  className='relative mb-4 aspect-video w-full border border-[#F4F2EC]/25 object-cover object-top'
                />
              ) : (
                <div className='relative mb-4 flex aspect-video items-center justify-center border border-[#F4F2EC]/25 bg-[#243239]'>
                  <span className='absolute left-1/2 top-0 h-full w-px bg-[#F4F2EC]/10' />
                  <span className='absolute left-0 top-1/2 h-px w-full bg-[#F4F2EC]/10' />
                  <Image
                    src={APP_ICONS[previewApp.id]}
                    alt=''
                    width={76}
                    height={76}
                    className='relative size-16 object-contain'
                  />
                  <span className='absolute bottom-2 left-3 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.12em] text-[#C9D0CE]'>
                    Förhandsvisning saknas
                  </span>
                </div>
              )}
              <div className='relative'>
                <p className='font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[#C9D0CE]'>
                  {previewApp.name}
                </p>
                <p className='mt-2 text-sm leading-relaxed text-[#F4F2EC]/85'>
                  {APP_DESCRIPTION[previewApp.id]}
                </p>
              </div>
            </aside>
          )}
        </section>
        <footer className='font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.16em] text-[#58636A]'>
          Projektet är byggt i Django, med Next.js som frontend.
          <br />
          Kontakt: frida.merell@gmail.com
        </footer>
      </div>
    </main>
  )
}
