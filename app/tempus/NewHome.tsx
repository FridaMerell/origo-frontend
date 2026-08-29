'use client'
import { TempusSpecies } from "../lib/dal"

const NewHome = ({followedSpecies} : {followedSpecies: TempusSpecies[]}) => {
  return (
    <div className="container flex my-10">
      <h1>Welcome to the New Home Page</h1>
      <ul>
        {followedSpecies.map((species) => (
          <li key={species.id}>{species.scientific_name}</li>
        ))}
      </ul>
    </div>
  )
}

export default NewHome