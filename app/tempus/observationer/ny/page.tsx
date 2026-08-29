import type { Metadata } from "next"
import ObservationForm from "../observation-form"

export const metadata: Metadata = {
  title: "Ny observation | Tempus",
  description: "Registrera en eller flera artobservationer.",
}

export default function NewObservationPage() {
  return <ObservationForm />
}
