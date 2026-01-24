import {prisma} from "@/lib/prisma";

export default async function Home() {
    const storiess = await prisma.stories.findMany()

  return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>

        <h2 className="text-xl font-semibold mt-6 mb-2">stories ({storiess?.length || 0}):</h2>
      </main>
  )
}