import type { GeoProjection } from "d3-geo"
import { wrap } from "./scene"
import type { View } from "./types"

// Ringarnas riktning på skärmen: +1 medurs. Dagarna och timmarna följer på varandra moturs, så
// att båda läses från vänster till höger vid visaren nere i söder.
export const DIRECTION = -1

// Var kalenderskivans ringar ligger på kartan: runt horisonten, datumringen innerst och
// timringen ytterst.
export type DialGeometry = {
	x: number
	y: number
	// Datumringens inre kant, ringarnas bredd och timringens yttre kant.
	inner: number
	band: number
	outer: number
	// Vinkeln på skärmen (radianer, medurs) där visaren sitter: rakt i söder. Dagen och klockslaget
	// som gäller står vid den.
	pointer: number
}

/** Ringarnas läge för en blickriktning. Null om horisonten inte går att projicera hel. */
export function dialGeometry(projection: GeoProjection, view: View): DialGeometry | null {
	// Horisonten blir en cirkel som är symmetrisk kring blickriktningen, så dess mitt ligger
	// mitt emellan horisontpunkten rakt fram och den rakt bakom.
	const ahead = projection([wrap(view.azimuth), 0])
	const behind = projection([wrap((view.azimuth + 180) % 360), 0])
	const south = projection([180, 0])
	if (!ahead || !behind || !south) return null
	const x = (ahead[0] + behind[0]) / 2
	const y = (ahead[1] + behind[1]) / 2
	const horizon = Math.hypot(ahead[0] - behind[0], ahead[1] - behind[1]) / 2
	// Ringarna följer himlens storlek; längst ut lämnar de en marginal mot ramen (se ZOOM_EXTENT).
	const band = horizon * 0.16
	const inner = horizon * 1.12
	return {
		x,
		y,
		inner,
		band,
		outer: inner + 2 * band,
		pointer: Math.atan2(south[1] - y, south[0] - x),
	}
}
