import { Drawer } from "@/app/components/ui/Drawer"
import ExpenseForm from "../expense-form"


export const metadata = {
  title: "Utgifter | Verso",
  description: "Hantera utgifter",
}
const Page = async () => {
  return (
     <div className="flex flex-1 flex-col gap-5 p-7">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-display font-semibold">Utgifter</h1>
            <Drawer trigger={'Ny utgift'} title={'Ny utgift'} triggerSize={'sm'}>
              <ExpenseForm  />
            </Drawer>
          </div>
          <section className="flex flex-row flex-wrap gap-4">
            
          </section>
        </div>
  );
};

export default Page;