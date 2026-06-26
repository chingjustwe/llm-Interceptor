import { useEffect, useState } from 'react'

export default function CostDashboard() {
  const [stats, setStats] = useState<any>({})

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
  }, [])

  return (
    <div>
      <h2>Cost Dashboard</h2>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  )
}
