import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: stories, error } = await supabase
      .from('Stories')
      .select('*')
      .limit(5)
      .order('created_at', { ascending: false })

  return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>

        {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error.message}
            </div>
        ) : (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <strong>Success!</strong> Database connected successfully.
            </div>
        )}

        <h2 className="text-xl font-semibold mt-6 mb-2">stories ({stories?.length || 0}):</h2>

        {!stories || stories.length === 0 ? (
            <p className="text-gray-600">No stories found.</p>
        ) : (
            <ul className="space-y-2">
              {stories.map((story) => (
                  <li key={story.id} className="bg-gray-100 p-3 rounded">
                    <div><strong>ID:</strong> {story.id}</div>
                  </li>
              ))}
            </ul>
        )}
      </main>
  )
}