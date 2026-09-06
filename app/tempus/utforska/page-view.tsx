"use client"

import { useEffect, useState } from "react"
import { Biotope } from "../ui/biotope-map"
import { Button } from "@/app/components/ui/Button"
import { Chip } from "@/app/components/ui/Chip"
import { X } from "lucide-react"
import { PlacePicker } from "../observationer/quick-observation/place-picker"

// Dyntaxa landscape-type code → the closest procedural map scene.
const LANDSCAPE_BIOTOPE = [
	{
		name: "S",
		label: "Skog",
	},
	{
		name: "J",
		label: "Jordbrukslandskap",
	},
	{
		name: "F",
		label: "Fjäll",
	},
	{
		name: "V",
		label: "Våtmark",
	},
	{
		name: "H",
		label: "Havsstrand",
	},
	{
		name: "U",
		label: "Urban/stadsmiljö",
	},
]

const BIOTOPES = [
	"Vattenyta",
	"Vattenmassa",
	"Blottad mark",
	"Öppna gräsmarker",
	"Torra gräsmarker",
	"Friska gräsmarker",
	"Fuktiga-blöta gräsmarker",
	"Åkermark",
	"Myrbiotoper",
	"Kalkrika myrbiotoper",
	"Kalkfattiga myrbiotoper",
	"Buskmark",
	"Trädbärande gräsmark",
	"Löv-/barrblandskog",
	"Barrskog",
	"Lövskog",
	"Triviallövskog",
	"Ädellövskog",
	"Strandbiotoper",
	"Sötvattensstrand",
	"Havsstrand",
	"Småbiotoper",
	"Mänskligt störd/skapad mark",
	"Inomhusmiljöer",
	"Vattendrag",
	"Sjöar",
	"Småvatten",
]

const SelectLocation = () => {
	return <></>
}

const SelectLandscapeType = ({
	onSelect,
}: {
	onSelect: (landscapeType: string) => void
}) => {
	return (
		<div className={"flex flex-wrap gap-2"}>
			{LANDSCAPE_BIOTOPE.map(type => (
				<Button
					key={type.name}
					onClick={() => {
						onSelect(type.label)
					}}
					variant={"primary"}
					size={"sm"}>
					{type.label}
				</Button>
			))}
		</div>
	)
}

const SelectBiotopes = ({
	setBiotopes,
}: {
	setBiotopes: (biotopes: string[]) => void
}) => {
	const [localBiotopes, setLocalBiotopes] = useState<string[]>([])

	useEffect(() => {
		setBiotopes(localBiotopes)
	}, [localBiotopes])

	return (
		<div className={"flex gap-2 flex-wrap"}>
			{BIOTOPES.map(biotope => {
				return (
					<Chip
						style={{ cursor: "pointer" }}
						variant={
							localBiotopes.includes(biotope) ? "neutral-active" : "neutral"
						}
						onClick={() => {
							if (localBiotopes.includes(biotope)) {
								setLocalBiotopes(localBiotopes.filter(b => b != biotope))
							} else {
								setLocalBiotopes([...localBiotopes, biotope])
							}
						}}>
						{biotope}
					</Chip>
				)
			})}
		</div>
	)
}

type Location = {
	lat: string
	lon: string
}

export default function PageView() {
	const [location, setLocation] = useState<Location | null>(null)
	const [landscapeType, setLandscapeType] = useState<string | null>(null)
	const [biotopes, setBiotopes] = useState<string[]>([])
	const [taxonomyInterests, setTaxonomyInterests] = useState<string[]>([])
	const [time, setTime] = useState<Date | null>(new Date())
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState()

	return (
		<div
			className={
				"flex flex-col gap-6 bg-surface border border-border p-4 rounded my-5"
			}>
			{results ? (
				<></>
			) : (
				<>
					<header className={"flex flex-col gap-2"}>
						
							<>
								<h1
									className={
										"font-display text-lg font-semibold tracking-tight"
									}>
									Hämta förslag på vad du kan titta efter
								</h1>
								<p className={"text-sm text-text-muted"}>
									Ange information om var du ska befinna dig så hämtar Tempus
									förslag på vad du kan titta efter.
								</p>
							</>
					</header>
					<div className={"flex flex-col gap-4"}>
						<hr className={"border-border"} />
						<header>
							<div className='font-mono text-[10px] uppercase tracking-[.2em] text-accent'>
								01.
							</div>
							<h2 className={"font-display"}>Plats</h2>
              <p>
                Ange en ungefärlig plats. Tempus hämtar på minimum 3 mil diameter runtomkring
              </p>
						</header>

						{location ? (
							<>
								{location.lat},{location.lon}
							</>
						) : (
							<PlacePicker
								lat={""}
								lon={""}
								onChange={setLocation}
								onClearError={() => {}}
								onError={() => {}}
							/>
						)}
					</div>
					<div className={"flex flex-col gap-6"}>
						<hr className={"border-border"} />
						<header>
							<div className='font-mono text-[10px] uppercase tracking-[.2em] text-accent'>
								02.
							</div>
							<h2 className={"font-display"}>Landskapstyp</h2>
						</header>
						{!landscapeType ? (
							<SelectLandscapeType onSelect={type => setLandscapeType(type)} />
						) : (
							<div>
								<Chip variant={"neutral-active"}>
									{landscapeType}{" "}
									<X
										cursor={"pointer"}
										size={"16"}
										onClick={() => {
											setLandscapeType("")
										}}
									/>
								</Chip>
							</div>
						)}
						<hr className={"border-border"} />
					</div>

					<div className={"flex flex-col gap-4"}>
						<header>
							<div className='font-mono text-[10px] uppercase tracking-[.2em] text-accent'>
								03.
							</div>
							<h2 className={"font-display"}>Biotoper</h2>
						</header>
						<SelectBiotopes setBiotopes={setBiotopes} />
					</div>
<hr className={'border-border'}/>
          <div>
            <Button>Sök</Button>
          </div>
				</>
			)}
		</div>
	)
}
