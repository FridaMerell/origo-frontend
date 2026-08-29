'use client'
import { followSpecies, unfollowSpecies } from "@/app/actions/tempus"
import { Button } from "@/app/components/ui/Button"
import { useEffect, useState } from "react"

const FollowButton = ({ initial, taxa,props }: { initial: boolean, taxa:string, props?: React.ComponentProps<typeof Button> }) => {
  const [isFollowing, setIsFollowing] = useState(initial)


  return (
    <Button
      {...props}
      className={`button ${isFollowing ? "button-following" : "button-follow"}`}
      onClick={() => {
        if(isFollowing) {
         unfollowSpecies(taxa)
        } else {
          followSpecies(taxa)
        }
        setIsFollowing(!isFollowing)
       }}
    >
      {isFollowing ? "Sparad" : "Spara"}
    </Button>
  )
}

export default FollowButton