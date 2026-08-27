import { useUser } from "@/app/lib/user-context"

export const metadata = {
  title: 'Rutt | Tempus',
  description: 'Rutt',
}

const Page = () => {
  const user = useUser()
  
  return <></>
}

export default Page