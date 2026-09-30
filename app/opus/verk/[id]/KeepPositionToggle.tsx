"use client"

import { useKeepPosition } from "../../_state/opus-context"
import { CheckboxField } from "../../forms/Fields/Fields"

/** Inställning för läsvyn: bläddra och hoppa runt utan att den sparade läspositionen flyttas. */
export default function KeepPositionToggle() {
	const [keepPosition, setKeepPosition] = useKeepPosition()
	return (
		<CheckboxField
			label={"Läs utan att uppdatera position"}
			checked={keepPosition}
			onChange={event => setKeepPosition(event.target.checked)}
		/>
	)
}
