import type { Metadata } from "next"
import { getBirdnetDeviceCollection, getCurrentUser, getFacilities, getUsers } from "@/app/lib/dal"
import BirdnetDeviceManager from "./birdnet-device-manager"
import BirdnetLiveFeed from "./birdnet-live-feed"

export const metadata: Metadata = {
  title: "BirdNET-enheter | Tempus",
  description: "Hantera BirdNET-enheter och deras kopplingar till hus och användare.",
}

export default async function BirdnetPage() {
  const [deviceCollection, houses, users, currentUser] = await Promise.all([
    getBirdnetDeviceCollection(),
    getFacilities(),
    getUsers(),
    getCurrentUser(),
  ])

  return (
    <>
      {!deviceCollection.loadError ? (
        <div className="container  pt-6 ">
          <BirdnetLiveFeed devices={deviceCollection.devices} />
        </div>
      ) : null}
      <BirdnetDeviceManager
        devices={deviceCollection.devices}
        loadError={deviceCollection.loadError}
        houses={houses}
        users={users}
        currentUserId={currentUser?.id ?? null}
      />
    </>
  )
}
