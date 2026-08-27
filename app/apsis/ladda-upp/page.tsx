import type { Metadata } from "next";
import UploadView from "./upload-view";

export const metadata: Metadata = {
  title: "Ladda upp | Apsis",
  description: "Lägg till egna absidfoton i samlingen.",
};

export default function LaddaUppPage() {
  return <UploadView />;
}
